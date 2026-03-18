import { decrypt, encrypt } from "../lib/encryption";
import type { PbxRepository } from "../repositories/pbx.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { WorkspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";
import type { MegaPbxIntegrationConfig } from "../schema";

const MEGAPBX_INTEGRATION = "megapbx" as const;
const MEGAPBX_PROVIDER = "megapbx" as const;
const MEGAPBX_AUTH_SCHEME = "bearer" as const;
const MEGAPBX_ENDPOINTS = {
  employees: "/crm/employees",
  numbers: "/crm/numbers",
  calls: "/crm/calls",
} as const;

type UpdateMegaPbxSettingsInput = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string | null;
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

function buildFixedMegaPbxConfig(
  input: UpdateMegaPbxSettingsInput,
  existing?: MegaPbxIntegrationConfig & { enabled: boolean },
): MegaPbxIntegrationConfig {
  return {
    baseUrl: ensureUrl(input.baseUrl),
    apiKey: input.apiKey?.trim()
      ? encrypt(input.apiKey.trim())
      : existing?.apiKey
        ? encrypt(existing.apiKey)
        : "",
    authScheme: MEGAPBX_AUTH_SCHEME,
    employeesEndpoint: {
      path: MEGAPBX_ENDPOINTS.employees,
      method: "GET" as const,
    },
    numbersEndpoint: {
      path: MEGAPBX_ENDPOINTS.numbers,
      method: "GET" as const,
    },
    callsEndpoint: {
      path: MEGAPBX_ENDPOINTS.calls,
      method: "GET" as const,
    },
    webhook: {
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
      authScheme: MEGAPBX_AUTH_SCHEME,
      apiKeyHeader: "",
      employeesPath: MEGAPBX_ENDPOINTS.employees,
      employeesMethod: "GET",
      employeesResultKey: "",
      numbersPath: MEGAPBX_ENDPOINTS.numbers,
      numbersMethod: "GET",
      numbersResultKey: "",
      callsPath: MEGAPBX_ENDPOINTS.calls,
      callsMethod: "GET",
      callsResultKey: "",
      recordingsPath: "",
      recordingsMethod: "GET",
      recordingsResultKey: "",
      webhookPath: "",
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
      authScheme: MEGAPBX_AUTH_SCHEME,
      employeesEndpoint: {
        path: MEGAPBX_ENDPOINTS.employees,
        method: "GET" as const,
      },
      numbersEndpoint: {
        path: MEGAPBX_ENDPOINTS.numbers,
        method: "GET" as const,
      },
      callsEndpoint: {
        path: MEGAPBX_ENDPOINTS.calls,
        method: "GET" as const,
      },
      webhook: {
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
          authScheme: MEGAPBX_AUTH_SCHEME,
          employeesEndpoint: {
            path: MEGAPBX_ENDPOINTS.employees,
            method: "GET" as const,
          },
          numbersEndpoint: {
            path: MEGAPBX_ENDPOINTS.numbers,
            method: "GET" as const,
          },
          callsEndpoint: {
            path: MEGAPBX_ENDPOINTS.calls,
            method: "GET" as const,
          },
          webhook: {
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
    const config = buildFixedMegaPbxConfig(input, existing ?? undefined);

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
