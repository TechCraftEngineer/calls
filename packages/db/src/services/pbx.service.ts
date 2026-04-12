import { decrypt, encrypt } from "../lib/encryption";
import type { PbxRepository } from "../repositories/pbx.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { WorkspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";
import type { MegaPbxIntegrationConfig } from "../schema";
import { normalizePhoneNumberList } from "../utils/normalize-phone-number-list";

const MEGAPBX_INTEGRATION = "megapbx" as const;
const MEGAPBX_PROVIDER = "megapbx" as const;
const MEGAPBX_ENDPOINTS = {
  employees: "/crmapi/v1/users",
  numbers: "/crmapi/v1/sims",
  calls: "/crmapi/v1/history/json",
} as const;

// Типы для разных операций обновления
type UpdateMegaPbxAccessInput = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string | null;
  syncFromDate?: string | null;
};

type UpdateMegaPbxSyncOptionsInput = {
  syncEmployees: boolean;
  syncNumbers: boolean;
  syncCalls: boolean;
  syncRecordings: boolean;
  webhooksEnabled: boolean;
};

type UpdateMegaPbxExcludedNumbersInput = {
  excludePhoneNumbers?: string[] | null;
};

type UpdateMegaPbxWebhookInput = {
  webhookSecret?: string | null;
};

// Полный тип для всех настроек (используется при создании/полном обновлении)
type UpdateMegaPbxSettingsInput = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string | null;
  syncFromDate?: string | null;
  excludePhoneNumbers?: string[] | null;
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
    value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  return url.replace(/\/$/, "");
}

function decryptIfPresent(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return decrypt(value);
}

function normalizeExcludePhoneNumbers(values?: string[] | null): string[] | undefined {
  const normalized = normalizePhoneNumberList(values);
  if (normalized.length === 0) return undefined;
  return normalized;
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
    syncFromDate:
      input.syncFromDate === null
        ? undefined
        : input.syncFromDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(input.syncFromDate.trim())
          ? input.syncFromDate.trim()
          : existing?.syncFromDate,
    excludePhoneNumbers: normalizeExcludePhoneNumbers(input.excludePhoneNumbers),
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
    const row = await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
      workspaceId,
      MEGAPBX_INTEGRATION,
    );
    const config = (row?.config ?? {}) as Partial<MegaPbxIntegrationConfig>;
    return {
      enabled: row?.enabled ?? false,
      baseUrl: ensureUrl(config.baseUrl ?? ""),
      apiKeySet: Boolean(config.apiKey?.trim()),
      syncFromDate: config.syncFromDate ?? "",
      excludePhoneNumbers: normalizeExcludePhoneNumbers(config.excludePhoneNumbers),
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
    const row = await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
      workspaceId,
      MEGAPBX_INTEGRATION,
    );
    if (!row) return null;
    const config = row.config as Partial<MegaPbxIntegrationConfig>;
    return {
      enabled: row.enabled,
      baseUrl: ensureUrl(config.baseUrl ?? ""),
      apiKey: decryptIfPresent(config.apiKey) ?? "",
      syncFromDate: config.syncFromDate ?? undefined,
      excludePhoneNumbers: normalizeExcludePhoneNumbers(config.excludePhoneNumbers),
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
    const rows = await this.workspaceIntegrationsRepository.listByType(MEGAPBX_INTEGRATION);
    return rows
      .filter((row) => row.enabled)
      .map((row) => {
        const config = row.config as Partial<MegaPbxIntegrationConfig>;
        return {
          workspaceId: row.workspaceId,
          baseUrl: ensureUrl(config.baseUrl ?? ""),
          apiKey: decryptIfPresent(config.apiKey) ?? "",
          syncFromDate: config.syncFromDate ?? undefined,
          excludePhoneNumbers: normalizeExcludePhoneNumbers(config.excludePhoneNumbers),
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

  private async updateSettingsWithDefaults(
    workspaceId: string,
    partial: Partial<UpdateMegaPbxSettingsInput>,
    username = "system",
  ): Promise<boolean> {
    const existing = await this.getConfigWithSecrets(workspaceId);

    // Если интеграция не существует, создаем её с настройками по умолчанию
    if (!existing) {
      const full: UpdateMegaPbxSettingsInput = {
        enabled: false,
        baseUrl: "",
        apiKey: null,
        syncFromDate: null,
        excludePhoneNumbers: null,
        webhookSecret: null,
        ftpHost: null,
        ftpUser: null,
        ftpPassword: null,
        syncEmployees: true,
        syncNumbers: true,
        syncCalls: true,
        syncRecordings: false,
        webhooksEnabled: false,
        ...partial,
      };
      return this.updateSettings(workspaceId, full, username);
    }

    // Если интеграция существует, обновляем её
    const full: UpdateMegaPbxSettingsInput = {
      enabled: existing.enabled,
      baseUrl: existing.baseUrl ?? "",
      apiKey: existing.apiKey ?? null,
      syncFromDate: existing.syncFromDate ?? null,
      excludePhoneNumbers: existing.excludePhoneNumbers ?? null,
      webhookSecret: existing.webhook?.secret ?? null,
      ftpHost: existing.ftpHost ?? null,
      ftpUser: existing.ftpUser ?? null,
      ftpPassword: existing.ftpPassword ?? null,
      syncEmployees: existing.syncEmployees ?? true,
      syncNumbers: existing.syncNumbers ?? true,
      syncCalls: existing.syncCalls ?? true,
      syncRecordings: existing.syncRecordings ?? false,
      webhooksEnabled: existing.webhooksEnabled ?? false,
      ...partial,
    };
    return this.updateSettings(workspaceId, full, username);
  }

  async updateAccess(
    workspaceId: string,
    partial: Partial<UpdateMegaPbxAccessInput>,
    username = "system",
  ): Promise<boolean> {
    return this.updateSettingsWithDefaults(workspaceId, partial, username);
  }

  async updateSyncOptions(
    workspaceId: string,
    partial: Partial<UpdateMegaPbxSyncOptionsInput>,
    username = "system",
  ): Promise<boolean> {
    return this.updateSettingsWithDefaults(workspaceId, partial, username);
  }

  async updateExcludedNumbers(
    workspaceId: string,
    partial: Partial<UpdateMegaPbxExcludedNumbersInput>,
    username = "system",
  ): Promise<boolean> {
    return this.updateSettingsWithDefaults(workspaceId, partial, username);
  }

  async updateWebhook(
    workspaceId: string,
    partial: Partial<UpdateMegaPbxWebhookInput>,
    username = "system",
  ): Promise<boolean> {
    return this.updateSettingsWithDefaults(workspaceId, partial, username);
  }

  async updateSettingsPartial(
    workspaceId: string,
    partial: Partial<UpdateMegaPbxSettingsInput>,
    username = "system",
  ): Promise<boolean> {
    return this.updateSettingsWithDefaults(workspaceId, partial, username);
  }

  listEmployees(workspaceId: string) {
    return this.pbxRepository.listEmployees(workspaceId, MEGAPBX_PROVIDER);
  }

  listNumbers(workspaceId: string) {
    return this.pbxRepository.listNumbers(workspaceId, MEGAPBX_PROVIDER);
  }

  listSyncStates(workspaceId: string) {
    return this.pbxRepository.listSyncStates(workspaceId, MEGAPBX_PROVIDER);
  }

  async updateEmployeeKpiSettings(input: {
    workspaceId: string;
    externalId: string;
    kpiBaseSalary: number;
    kpiTargetBonus: number;
    kpiTargetTalkTimeMinutes: number;
  }) {
    return this.pbxRepository.updateEmployeeKpiSettings({
      workspaceId: input.workspaceId,
      provider: MEGAPBX_PROVIDER,
      externalId: input.externalId,
      kpiBaseSalary: input.kpiBaseSalary,
      kpiTargetBonus: input.kpiTargetBonus,
      kpiTargetTalkTimeMinutes: input.kpiTargetTalkTimeMinutes,
    });
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

  async upsertEmployees(
    workspaceId: string,
    items: Array<{
      externalId: string;
      extension?: string | null;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      displayName: string;
      isActive?: boolean;
      rawData: Record<string, unknown>;
    }>,
  ) {
    return this.pbxRepository.upsertEmployees(
      items.map((item) => ({
        ...item,
        workspaceId,
        provider: MEGAPBX_PROVIDER,
      })),
    );
  }

  async upsertNumbers(
    workspaceId: string,
    items: Array<{
      externalId: string;
      phoneNumber: string;
      extension?: string | null;
      label?: string | null;
      lineType?: string | null;
      employeeExternalId?: string | null;
      isActive?: boolean;
      rawData: Record<string, unknown>;
    }>,
  ) {
    return this.pbxRepository.upsertNumbers(
      items.map((item) => ({
        ...item,
        workspaceId,
        provider: MEGAPBX_PROVIDER,
      })),
    );
  }
}

export type MegaPbxService = PbxService;
