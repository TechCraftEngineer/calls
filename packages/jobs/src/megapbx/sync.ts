import {
  callsService,
  filesService,
  type MegaPbxIntegrationConfig,
  pbxRepository,
  pbxService,
} from "@calls/db";
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

type SyncStats = {
  employees: number;
  numbers: number;
  autoLinked: number;
  calls: number;
  recordings: number;
  skipped: number;
  errors: string[];
  latestCursor: string | null;
};

async function autoLinkEmployees(
  workspaceId: string,
  employees: NormalizedEmployee[],
): Promise<number> {
  let linked = 0;
  const existingLinks = await pbxRepository.getLinkMap(
    workspaceId,
    PROVIDER,
    "employee",
  );

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
    const invites = await pbxRepository.findCandidateInvitations(workspaceId, [
      employee.email,
    ]);
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
  workspaceId: string,
  providerCallId: string,
  recordingUrl: string | null,
): Promise<{ fileId: string | null; sizeBytes: number | null }> {
  if (!recordingUrl) return { fileId: null, sizeBytes: null };

  const downloadTimeoutMsRaw = Number(
    process.env.MEGAPBX_RECORDING_DOWNLOAD_TIMEOUT_MS,
  );
  const downloadTimeoutMs =
    Number.isFinite(downloadTimeoutMsRaw) && downloadTimeoutMsRaw > 0
      ? downloadTimeoutMsRaw
      : 30_000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), downloadTimeoutMs);

  let response: Response;
  try {
    response = await fetch(recordingUrl, { signal: controller.signal });
  } catch (error) {
    const isAbortError =
      controller.signal.aborted ||
      (error instanceof Error && error.name === "AbortError");

    if (isAbortError) {
      throw new Error(
        `Таймаут скачивания записи MegaPBX (${providerCallId}) после ${downloadTimeoutMs}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(
      `Не удалось скачать запись ${providerCallId}: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    return { fileId: null, sizeBytes: null };
  }

  const extension = recordingUrl.toLowerCase().endsWith(".wav") ? "wav" : "mp3";
  const filename = `megapbx/${providerCallId}.${extension}`;
  const upload = await filesService.uploadCallRecording(
    workspaceId,
    filename,
    buffer,
    "manual",
  );

  return {
    fileId: upload.id,
    sizeBytes: buffer.length,
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

export async function syncMegaPbxCalls(
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
    skipped: 0,
    errors: [],
    latestCursor: null,
  };

  const syncState = await pbxRepository.getSyncState(
    workspaceId,
    PROVIDER,
    "calls",
  );
  await pbxRepository.updateSyncState({
    workspaceId,
    provider: PROVIDER,
    syncType: "calls",
    status: "running",
    cursor: syncState?.cursor ?? null,
    markStarted: true,
  });

  try {
    const employeeMap = await pbxRepository.getEmployeeMap(
      workspaceId,
      PROVIDER,
    );
    const numberMap = await pbxRepository.getNumberMap(workspaceId, PROVIDER);
    const calls = (await client.fetchCalls(syncState?.cursor ?? null))
      .map(normalizeCall)
      .filter((item): item is NormalizedCall => Boolean(item))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    for (const call of calls) {
      const filename = `megapbx/${call.externalId}.json`;
      const existing = await callsService.getCallByFilename(
        filename,
        workspaceId,
      );
      if (existing) {
        stats.skipped += 1;
        stats.latestCursor = call.timestamp;
        continue;
      }

      const employee = call.employeeExternalId
        ? employeeMap.get(call.employeeExternalId)
        : undefined;
      const number = call.numberExternalId
        ? numberMap.get(call.numberExternalId)
        : undefined;

      let fileId: string | null = null;
      let sizeBytes: number | null = null;

      if (config.syncRecordings && call.recordingUrl) {
        try {
          const uploaded = await uploadRecordingIfNeeded(
            workspaceId,
            call.externalId,
            call.recordingUrl,
          );
          fileId = uploaded.fileId;
          sizeBytes = uploaded.sizeBytes;
          if (fileId) {
            stats.recordings += 1;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          stats.errors.push(message);
          logger.warn("Ошибка загрузки записи MegaPBX", {
            workspaceId,
            callId: call.externalId,
            error: message,
          });
        }
      }

      await callsService.createCall({
        workspaceId,
        filename,
        timestamp: call.timestamp,
        number: call.externalNumber,
        internalNumber:
          call.internalNumber ??
          number?.extension ??
          employee?.extension ??
          null,
        direction: call.direction,
        duration: call.duration,
        status: call.status,
        source: employee?.externalId ?? number?.externalId ?? "megapbx",
        name: employee?.displayName ?? number?.label ?? "MegaPBX",
        fileId,
        sizeBytes,
      });

      stats.calls += 1;
      stats.latestCursor = call.timestamp;
    }

    await pbxRepository.updateSyncState({
      workspaceId,
      provider: PROVIDER,
      syncType: "calls",
      status: "success",
      cursor: stats.latestCursor,
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

export async function syncMegaPbxWorkspace(
  workspaceId: string,
  config: MegaPbxIntegrationConfig,
) {
  const directory = await syncMegaPbxDirectory(workspaceId, config);

  const calls = config.syncCalls
    ? await syncMegaPbxCalls(workspaceId, config)
    : null;

  logger.info("MegaPBX синхронизация завершена", {
    workspaceId,
    directory,
    calls,
  });

  return { directory, calls };
}

export async function runActiveMegaPbxSync() {
  const integrations = await pbxService.listActiveIntegrations();
  const results: Array<{ workspaceId: string; ok: boolean; error?: string }> =
    [];

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
