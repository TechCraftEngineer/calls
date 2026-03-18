import { decrypt, encrypt } from "../lib/encryption";
import type { PbxRepository } from "../repositories/pbx.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { WorkspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";
import type { MegaPbxIntegrationConfig } from "../schema";

const MEGAPBX_INTEGRATION = "megapbx" as const;
const MEGAPBX_PROVIDER = "megapbx" as const;

type UpdateMegaPbxSettingsInput = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string | null;
  authScheme?: "bearer" | "x-api-key" | "query";
  apiKeyHeader?: string;
  employeesPath?: string | null;
  employeesMethod?: "GET" | "POST";
  employeesResultKey?: string | null;
  numbersPath?: string | null;
  numbersMethod?: "GET" | "POST";
  numbersResultKey?: string | null;
  callsPath?: string | null;
  callsMethod?: "GET" | "POST";
  callsResultKey?: string | null;
  recordingsPath?: string | null;
  recordingsMethod?: "GET" | "POST";
  recordingsResultKey?: string | null;
  webhookPath?: string | null;
  webhookSecret?: string | null;
  ftpHost?: string | null;
  ftpUser?: string | null;
  ftpPassword?: string | null;
  syncEmployees: boolean;
  syncNumbers: boolean;
  syncCalls: boolean;
  syncRecordings: boolean;
  webhooksEnabled: boolean;
};

function ensureUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const url =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;
  return url.replace(/\/$/, "");
}

function decryptIfPresent(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return decrypt(value);
}

export class PbxService {
  constructor(
    private workspaceIntegrationsRepository: WorkspaceIntegrationsRepository,
    private pbxRepository: PbxRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getSettings(workspaceId: string) {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        MEGAPBX_INTEGRATION,
      );
    const config = (row?.config ?? {}) as Partial<MegaPbxIntegrationConfig>;
    return {
      enabled: row?.enabled ?? false,
      baseUrl: config.baseUrl ?? "",
      apiKeySet: Boolean(config.apiKey?.trim()),
      authScheme: config.authScheme ?? "bearer",
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      employeesPath: config.employeesEndpoint?.path ?? "",
      employeesMethod: config.employeesEndpoint?.method ?? "GET",
      employeesResultKey: config.employeesEndpoint?.resultKey ?? "",
      numbersPath: config.numbersEndpoint?.path ?? "",
      numbersMethod: config.numbersEndpoint?.method ?? "GET",
      numbersResultKey: config.numbersEndpoint?.resultKey ?? "",
      callsPath: config.callsEndpoint?.path ?? "",
      callsMethod: config.callsEndpoint?.method ?? "GET",
      callsResultKey: config.callsEndpoint?.resultKey ?? "",
      recordingsPath: config.recordingsEndpoint?.path ?? "",
      recordingsMethod: config.recordingsEndpoint?.method ?? "GET",
      recordingsResultKey: config.recordingsEndpoint?.resultKey ?? "",
      webhookPath: config.webhook?.path ?? "",
      webhookSecretSet: Boolean(config.webhook?.secret?.trim()),
      ftpHost: config.ftpHost ?? "",
      ftpUser: config.ftpUser ?? "",
      ftpPasswordSet: Boolean(config.ftpPassword?.trim()),
      syncEmployees: config.syncEmployees ?? true,
      syncNumbers: config.syncNumbers ?? true,
      syncCalls: config.syncCalls ?? true,
      syncRecordings: config.syncRecordings ?? false,
      webhooksEnabled: config.webhooksEnabled ?? false,
    };
  }

  async getConfigWithSecrets(
    workspaceId: string,
  ): Promise<(MegaPbxIntegrationConfig & { enabled: boolean }) | null> {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        MEGAPBX_INTEGRATION,
      );
    if (!row) return null;
    const config = row.config as Partial<MegaPbxIntegrationConfig>;
    return {
      enabled: row.enabled,
      baseUrl: config.baseUrl ?? "",
      apiKey: decryptIfPresent(config.apiKey) ?? "",
      authScheme: config.authScheme ?? "bearer",
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      employeesEndpoint: config.employeesEndpoint,
      numbersEndpoint: config.numbersEndpoint,
      callsEndpoint: config.callsEndpoint,
      recordingsEndpoint: config.recordingsEndpoint,
      webhook: {
        path: config.webhook?.path,
        secret: decryptIfPresent(config.webhook?.secret) ?? undefined,
      },
      ftpHost: config.ftpHost ?? undefined,
      ftpUser: config.ftpUser ?? undefined,
      ftpPassword: decryptIfPresent(config.ftpPassword) ?? undefined,
      syncEmployees: config.syncEmployees ?? true,
      syncNumbers: config.syncNumbers ?? true,
      syncCalls: config.syncCalls ?? true,
      syncRecordings: config.syncRecordings ?? false,
      webhooksEnabled: config.webhooksEnabled ?? false,
    };
  }

  async listActiveIntegrations(): Promise<
    Array<MegaPbxIntegrationConfig & { workspaceId: string }>
  > {
    const rows =
      await this.workspaceIntegrationsRepository.listByType(
        MEGAPBX_INTEGRATION,
      );
    return rows
      .filter((row) => row.enabled)
      .map((row) => {
        const config = row.config as Partial<MegaPbxIntegrationConfig>;
        return {
          workspaceId: row.workspaceId,
          baseUrl: config.baseUrl ?? "",
          apiKey: decryptIfPresent(config.apiKey) ?? "",
          authScheme: config.authScheme ?? "bearer",
          apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
          employeesEndpoint: config.employeesEndpoint,
          numbersEndpoint: config.numbersEndpoint,
          callsEndpoint: config.callsEndpoint,
          recordingsEndpoint: config.recordingsEndpoint,
          webhook: {
            path: config.webhook?.path,
            secret: decryptIfPresent(config.webhook?.secret) ?? undefined,
          },
          ftpHost: config.ftpHost ?? undefined,
          ftpUser: config.ftpUser ?? undefined,
          ftpPassword: decryptIfPresent(config.ftpPassword) ?? undefined,
          syncEmployees: config.syncEmployees ?? true,
          syncNumbers: config.syncNumbers ?? true,
          syncCalls: config.syncCalls ?? true,
          syncRecordings: config.syncRecordings ?? false,
          webhooksEnabled: config.webhooksEnabled ?? false,
        };
      })
      .filter((row) => row.baseUrl && row.apiKey);
  }

  async updateSettings(
    workspaceId: string,
    input: UpdateMegaPbxSettingsInput,
    username = "system",
  ): Promise<boolean> {
    const existing = await this.getConfigWithSecrets(workspaceId);
    const config: MegaPbxIntegrationConfig = {
      baseUrl: ensureUrl(input.baseUrl),
      apiKey: input.apiKey?.trim()
        ? encrypt(input.apiKey.trim())
        : existing?.apiKey
          ? encrypt(existing.apiKey)
          : "",
      authScheme: input.authScheme ?? existing?.authScheme ?? "bearer",
      apiKeyHeader:
        input.apiKeyHeader?.trim() || existing?.apiKeyHeader || "X-API-Key",
      employeesEndpoint: input.employeesPath?.trim()
        ? {
            path: input.employeesPath.trim(),
            method: input.employeesMethod ?? "GET",
            resultKey: input.employeesResultKey?.trim() || undefined,
          }
        : undefined,
      numbersEndpoint: input.numbersPath?.trim()
        ? {
            path: input.numbersPath.trim(),
            method: input.numbersMethod ?? "GET",
            resultKey: input.numbersResultKey?.trim() || undefined,
          }
        : undefined,
      callsEndpoint: input.callsPath?.trim()
        ? {
            path: input.callsPath.trim(),
            method: input.callsMethod ?? "GET",
            resultKey: input.callsResultKey?.trim() || undefined,
          }
        : undefined,
      recordingsEndpoint: input.recordingsPath?.trim()
        ? {
            path: input.recordingsPath.trim(),
            method: input.recordingsMethod ?? "GET",
            resultKey: input.recordingsResultKey?.trim() || undefined,
          }
        : undefined,
      webhook: {
        path: input.webhookPath?.trim() || existing?.webhook?.path,
        secret: input.webhookSecret?.trim()
          ? encrypt(input.webhookSecret.trim())
          : existing?.webhook?.secret
            ? encrypt(existing.webhook.secret)
            : undefined,
      },
      ftpHost: input.ftpHost?.trim() || undefined,
      ftpUser: input.ftpUser?.trim() || undefined,
      ftpPassword: input.ftpPassword?.trim()
        ? encrypt(input.ftpPassword.trim())
        : existing?.ftpPassword
          ? encrypt(existing.ftpPassword)
          : undefined,
      syncEmployees: input.syncEmployees,
      syncNumbers: input.syncNumbers,
      syncCalls: input.syncCalls,
      syncRecordings: input.syncRecordings,
      webhooksEnabled: input.webhooksEnabled,
    };

    const result = await this.workspaceIntegrationsRepository.upsert(
      workspaceId,
      MEGAPBX_INTEGRATION,
      input.enabled,
      config as unknown as Record<string, unknown>,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `MegaPBX ${input.enabled ? "включён" : "выключен"}, настройки обновлены`,
        username,
        workspaceId,
      );
    }

    return result;
  }

  listEmployees(workspaceId: string) {
    return this.pbxRepository.listEmployees(workspaceId, MEGAPBX_PROVIDER);
  }

  listNumbers(workspaceId: string) {
    return this.pbxRepository.listNumbers(workspaceId, MEGAPBX_PROVIDER);
  }

  listLinks(workspaceId: string) {
    return this.pbxRepository.listLinks(workspaceId, MEGAPBX_PROVIDER);
  }

  listSyncStates(workspaceId: string) {
    return this.pbxRepository.listSyncStates(workspaceId, MEGAPBX_PROVIDER);
  }

  async linkTarget(input: {
    workspaceId: string;
    targetType: "employee" | "number";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
    linkedByUserId?: string | null;
    linkSource?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }) {
    return this.pbxRepository.upsertLink({
      ...input,
      provider: MEGAPBX_PROVIDER,
    });
  }

  async unlinkTarget(
    workspaceId: string,
    targetType: "employee" | "number",
    targetExternalId: string,
  ) {
    return this.pbxRepository.deleteLink(
      workspaceId,
      MEGAPBX_PROVIDER,
      targetType,
      targetExternalId,
    );
  }

  async recordWebhookEvent(input: {
    workspaceId: string;
    eventId?: string | null;
    eventType: string;
    payload: Record<string, unknown>;
    status?: string;
    errorMessage?: string | null;
    processedAt?: Date | null;
  }) {
    return this.pbxRepository.insertWebhookEvent({
      ...input,
      provider: MEGAPBX_PROVIDER,
    });
  }
}

export type MegaPbxService = PbxService;
