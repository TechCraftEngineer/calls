import { getAudioDurationFromBuffer } from "@calls/asr/audio/get-audio-duration";
import {
  callsService,
  filesService,
  type MegaPbxIntegrationConfig,
  pbxRepository,
  pbxService,
} from "@calls/db";
import { inngest, transcribeRequested } from "../inngest/client";
import { createLogger } from "../logger";
import { MegaPbxClient } from "./client";
import {
  type NormalizedCall,
  type NormalizedEmployee,
  type NormalizedNumber,
  normalizeCall,
  normalizeEmployee,
  normalizeNumber,
} from "./normalize";

const logger = createLogger("megapbx-sync");
const PROVIDER = "megapbx";

function isEmptyOrMegaPbxPlaceholder(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length === 0 || normalized === "megapbx";
}

type SyncStats = {
  employees: number;
  numbers: number;
  autoLinked: number;
  calls: number;
  recordings: number;
  transcriptionsQueued: number;
  skipped: number;
  errors: string[];
  latestCursor: string | null;
};

function normalizePhoneForMatch(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function shouldSkipCallByExcludedPhoneNumbers(
  call: NormalizedCall,
  excludePhoneNumbers: string[] | undefined,
): boolean {
  if (!excludePhoneNumbers || excludePhoneNumbers.length === 0) return false;

  const excluded = new Set(
    excludePhoneNumbers
      .map((value) => normalizePhoneForMatch(value))
      .filter((value): value is string => value !== null),
  );
  if (excluded.size === 0) return false;

  const internal = normalizePhoneForMatch(call.internalNumber);
  const external = normalizePhoneForMatch(call.externalNumber);
  const values = [internal, external].filter((value): value is string => value !== null);
  for (const value of values) {
    if (excluded.has(value)) return true;
    for (const excludedValue of excluded) {
      if (
        value === excludedValue ||
        value.endsWith(excludedValue) ||
        excludedValue.endsWith(value)
      ) {
        return true;
      }
    }
  }
  return false;
}

async function autoLinkEmployees(
  workspaceId: string,
  employees: NormalizedEmployee[],
): Promise<number> {
  let linked = 0;
  const existingLinks = await pbxRepository.getLinkMap(workspaceId, PROVIDER, "employee");

  for (const employee of employees) {
    if (existingLinks.has(employee.externalId)) continue;

    const candidates = await pbxRepository.findCandidateUsers(
      workspaceId,
      employee.extension ? [employee.extension] : [],
      employee.email ? [employee.email] : [],
    );

    if (candidates.length === 1) {
      await pbxRepository.upsertLink({
        workspaceId,
        provider: PROVIDER,
        targetType: "employee",
        targetExternalId: employee.externalId,
        userId: candidates[0]?.id ?? null,
        linkSource: employee.extension ? "auto_extension" : "auto_email",
        confidence: employee.extension ? 100 : 85,
      });
      linked += 1;
      continue;
    }

    if (!employee.email) continue;
    const invites = await pbxRepository.findCandidateInvitations(workspaceId, [employee.email]);
    if (invites.length === 1) {
      await pbxRepository.upsertLink({
        workspaceId,
        provider: PROVIDER,
        targetType: "employee",
        targetExternalId: employee.externalId,
        invitationId: invites[0]?.id ?? null,
        linkSource: "auto_invitation_email",
        confidence: 80,
      });
      linked += 1;
    }
  }

  return linked;
}

async function uploadRecordingIfNeeded(
  client: MegaPbxClient,
  workspaceId: string,
  providerCallId: string,
  recordingUrl: string | null,
): Promise<{ fileId: string | null }> {
  if (!recordingUrl) return { fileId: null };
  const { buffer, extension } = await client.downloadRecording(recordingUrl);
  if (buffer.length === 0) {
    return { fileId: null };
  }

  const filename = `megapbx/${providerCallId}.${extension}`;
  let fileDurationSeconds: number | null = null;
  const duration = await getAudioDurationFromBuffer(buffer);
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    fileDurationSeconds = duration;
  } else {
    logger.warn("Не удалось определить длительность записи", {
      providerCallId,
      duration,
    });
  }

  const upload = await filesService.uploadCallRecording(
    workspaceId,
    filename,
    buffer,
    "manual",
    fileDurationSeconds,
  );

  return {
    fileId: upload.id,
  };
}

export async function testMegaPbxConnection(
  config: MegaPbxIntegrationConfig,
): Promise<{ success: true } | { success: false; error: string }> {
  const client = new MegaPbxClient(config);
  return client.testConnection();
}

export async function syncMegaPbxDirectory(
  workspaceId: string,
  config: MegaPbxIntegrationConfig,
): Promise<SyncStats> {
  const client = new MegaPbxClient(config);
  const stats: SyncStats = {
    employees: 0,
    numbers: 0,
    autoLinked: 0,
    calls: 0,
    recordings: 0,
    transcriptionsQueued: 0,
    skipped: 0,
    errors: [],
    latestCursor: null,
  };

  await pbxRepository.updateSyncState({
    workspaceId,
    provider: PROVIDER,
    syncType: "directory",
    status: "running",
    markStarted: true,
  });

  try {
    const [employeesRaw, numbersRaw] = await Promise.all([
      config.syncEmployees ? client.fetchEmployees() : Promise.resolve([]),
      config.syncNumbers ? client.fetchNumbers() : Promise.resolve([]),
    ]);

    const employees = employeesRaw
      .map(normalizeEmployee)
      .filter((item): item is NormalizedEmployee => Boolean(item));
    const numbers = numbersRaw
      .map(normalizeNumber)
      .filter((item): item is NormalizedNumber => Boolean(item));

    await pbxRepository.upsertEmployees(
      employees.map((item) => ({ ...item, workspaceId, provider: PROVIDER })),
    );
    await pbxRepository.upsertNumbers(
      numbers.map((item) => ({ ...item, workspaceId, provider: PROVIDER })),
    );

    stats.employees = employees.length;
    stats.numbers = numbers.length;
    stats.autoLinked = await autoLinkEmployees(workspaceId, employees);

    await pbxRepository.updateSyncState({
      workspaceId,
      provider: PROVIDER,
      syncType: "directory",
      status: "success",
      stats,
      markCompleted: true,
      markSuccessful: true,
    });

    return stats;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.errors.push(message);
    await pbxRepository.updateSyncState({
      workspaceId,
      provider: PROVIDER,
      syncType: "directory",
      status: "error",
      lastError: message,
      stats,
      markCompleted: true,
    });
    throw error;
  }
}

/** Извлекает записи звонков из payload вебхука (формат requests#history: https://api.megapbx.ru/#/docs/crmapi/v1/requests#history) */
function extractCallsFromWebhookPayload(
  payload: Record<string, unknown>,
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
    );
  }
  const keys = ["history", "calls", "items", "data", "result"];
  for (const key of keys) {
    const nested = payload[key];
    if (Array.isArray(nested)) {
      return nested.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      );
    }
  }
  if (payload.uid || payload.start || payload.id || payload.callId || payload.timestamp) {
    return [payload];
  }
  return [];
}

export async function syncMegaPbxCalls(
  workspaceId: string,
  config: MegaPbxIntegrationConfig,
  webhookPayload?: Record<string, unknown>,
): Promise<SyncStats> {
  const client = new MegaPbxClient(config);
  const stats: SyncStats = {
    employees: 0,
    numbers: 0,
    autoLinked: 0,
    calls: 0,
    recordings: 0,
    transcriptionsQueued: 0,
    skipped: 0,
    errors: [],
    latestCursor: null,
  };

  const syncState = await pbxRepository.getSyncState(workspaceId, PROVIDER, "calls");
  await pbxRepository.updateSyncState({
    workspaceId,
    provider: PROVIDER,
    syncType: "calls",
    status: "running",
    cursor: syncState?.cursor ?? config.syncFromDate ?? null,
    markStarted: true,
  });

  try {
    const employeeMap = await pbxRepository.getEmployeeMap(workspaceId, PROVIDER);
    const numberMap = await pbxRepository.getNumberMap(workspaceId, PROVIDER);

    const rawCalls = webhookPayload
      ? extractCallsFromWebhookPayload(webhookPayload)
      : await client.fetchCalls(syncState?.cursor ?? config.syncFromDate ?? null);

    const calls = rawCalls
      .map(normalizeCall)
      .filter((item): item is NormalizedCall => Boolean(item))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const excludePhoneNumbers = config.excludePhoneNumbers ?? [];

    for (const call of calls) {
      if (shouldSkipCallByExcludedPhoneNumbers(call, excludePhoneNumbers)) {
        stats.skipped += 1;
        stats.latestCursor = call.timestamp;
        continue;
      }

      const filename = `megapbx/${call.externalId}.json`;
      const employee = call.employeeExternalId
        ? employeeMap.get(call.employeeExternalId)
        : undefined;
      const number = call.numberExternalId ? numberMap.get(call.numberExternalId) : undefined;

      const createResult = await callsService.createCallWithResult({
        workspaceId,
        filename,
        provider: PROVIDER,
        externalId: call.externalId,
        timestamp: call.timestamp,
        number: call.externalNumber,
        internalNumber: call.internalNumber ?? number?.extension ?? employee?.extension ?? null,
        direction: call.direction,
        status: call.status,
        source: employee?.externalId ?? number?.externalId ?? "megapbx",
        name: employee?.displayName ?? number?.label ?? "MegaPBX",
        fileId: null,
      });

      const canonicalCall =
        (await callsService.getCallByExternalId(workspaceId, PROVIDER, call.externalId)) ??
        (await callsService.getCallByFilename(filename, workspaceId));

      if (!canonicalCall) {
        throw new Error(
          `Canonical call not found after create (workspaceId=${workspaceId}, provider=${PROVIDER}, externalId=${call.externalId}, filename=${filename})`,
        );
      }

      // На повторных синках запись звонка может уже существовать с пустой PBX-привязкой.
      // Дозаполняем связь и вспомогательные поля, когда появились данные из directory.
      if (!createResult.created) {
        const internalNumber = !canonicalCall.internalNumber?.trim()
          ? (normalizePhoneForMatch(call.internalNumber) ??
            normalizePhoneForMatch(number?.extension) ??
            normalizePhoneForMatch(employee?.extension) ??
            null)
          : undefined;
        const source = isEmptyOrMegaPbxPlaceholder(canonicalCall.source)
          ? (employee?.externalId ?? number?.externalId ?? "megapbx")
          : undefined;
        const name = isEmptyOrMegaPbxPlaceholder(canonicalCall.name)
          ? (employee?.displayName ?? number?.label ?? "MegaPBX")
          : undefined;

        // Используем транзакционный метод для атомарного обновления
        if (internalNumber || source || name) {
          await callsService.updateCallPbxBinding(canonicalCall.id, {
            internalNumber,
            source,
            name,
          });
        }
      }
      let recordingFileId: string | null = canonicalCall.fileId;

      if (config.syncRecordings && call.recordingUrl && !canonicalCall.fileId) {
        try {
          const uploaded = await uploadRecordingIfNeeded(
            client,
            workspaceId,
            call.externalId,
            call.recordingUrl,
          );
          if (uploaded.fileId) {
            await callsService.updateCallRecording(canonicalCall.id, {
              fileId: uploaded.fileId,
            });
            recordingFileId = uploaded.fileId;
            stats.recordings += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          stats.errors.push(message);
          logger.warn("Ошибка загрузки записи MegaPBX", {
            workspaceId,
            callId: call.externalId,
            callRecordId: canonicalCall.id,
            createResultId: createResult.id,
            error: message,
          });
        }
      }

      if (createResult.created && recordingFileId) {
        await inngest.send(transcribeRequested.create({ callId: canonicalCall.id }));
        stats.transcriptionsQueued += 1;
      }

      if (createResult.created) {
        stats.calls += 1;
      } else {
        stats.skipped += 1;
      }
      stats.latestCursor = call.timestamp;
    }

    const previousCursor = syncState?.cursor ?? config.syncFromDate ?? null;
    const nextCursor = webhookPayload
      ? previousCursor
      : previousCursor && stats.latestCursor
        ? stats.latestCursor > previousCursor
          ? stats.latestCursor
          : previousCursor
        : (stats.latestCursor ?? previousCursor);

    await pbxRepository.updateSyncState({
      workspaceId,
      provider: PROVIDER,
      syncType: "calls",
      status: "success",
      cursor: nextCursor,
      stats,
      markCompleted: true,
      markSuccessful: true,
    });

    return stats;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.errors.push(message);
    await pbxRepository.updateSyncState({
      workspaceId,
      provider: PROVIDER,
      syncType: "calls",
      status: "error",
      lastError: message,
      stats,
      markCompleted: true,
    });
    throw error;
  }
}

export async function syncMegaPbxWorkspace(workspaceId: string, config: MegaPbxIntegrationConfig) {
  const directory = await syncMegaPbxDirectory(workspaceId, config);

  const calls = config.syncCalls ? await syncMegaPbxCalls(workspaceId, config) : null;

  logger.info("MegaPBX синхронизация завершена", {
    workspaceId,
    directory,
    calls,
  });

  return { directory, calls };
}

export async function runActiveMegaPbxSync() {
  const integrations = await pbxService.listActiveIntegrations();
  const results: Array<{ workspaceId: string; ok: boolean; error?: string }> = [];

  for (const integration of integrations) {
    try {
      await syncMegaPbxWorkspace(integration.workspaceId, integration);
      results.push({ workspaceId: integration.workspaceId, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        workspaceId: integration.workspaceId,
        ok: false,
        error: message,
      });
      logger.error("Ошибка фонового синка MegaPBX", {
        workspaceId: integration.workspaceId,
        error: message,
      });
    }
  }

  return results;
}
