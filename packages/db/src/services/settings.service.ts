/**
 * Settings service - handles business logic for application settings
 */

import { decrypt, encrypt } from "../lib/encryption";
import type { PromptsRepository } from "../repositories/prompts.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { WorkspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";

const FTP_INTEGRATION = "ftp" as const;

export class SettingsService {
  constructor(
    private promptsRepository: PromptsRepository,
    private systemRepository: SystemRepository,
    private workspaceIntegrationsRepository: WorkspaceIntegrationsRepository,
  ) {}

  async getSetting(key: string, workspaceId: string): Promise<string | null> {
    return this.promptsRepository.findByKeyWithDefault(key, workspaceId);
  }

  /** Токен бота в расшифрованном виде (для Telegram, MAX и др.) */
  async getDecryptedBotToken(
    key: string,
    workspaceId: string,
  ): Promise<string | null> {
    const raw = await this.promptsRepository.findByKeyWithDefault(
      key,
      workspaceId,
    );
    if (!raw?.trim()) return null;
    return decrypt(raw);
  }

  /** Сохранить токен бота в зашифрованном виде */
  async updateBotToken(
    key: string,
    value: string,
    description: string,
    workspaceId: string,
  ): Promise<boolean> {
    const toStore = value.trim() ? encrypt(value.trim()) : "";
    return this.promptsRepository.upsert(
      key,
      toStore,
      description,
      workspaceId,
    );
  }

  /** Workspace IDs с настроенным Telegram ботом */
  async getWorkspaceIdsWithTelegramBot(): Promise<string[]> {
    return this.promptsRepository.findWorkspaceIdsWithKey("telegram_bot_token");
  }

  /** Список активных интеграций FTP по всем workspace */
  async getActiveFtpIntegrations(): Promise<
    Array<{
      workspaceId: string;
      host: string;
      user: string;
      password: string;
      syncFromDate: string;
    }>
  > {
    const rows = await this.workspaceIntegrationsRepository.listActiveFtp();
    return rows.map((r) => ({
      ...r,
      password: decrypt(r.password),
    }));
  }

  async getFtpSettings(workspaceId: string): Promise<{
    enabled: boolean;
    host: string | null;
    user: string | null;
    /** Пароль не возвращается из соображений безопасности. Используйте passwordSet. */
    passwordSet: boolean;
    /** С какой даты выгружать записи (YYYY-MM-DD) */
    syncFromDate: string;
  }> {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        FTP_INTEGRATION,
      );

    const defaultFromDate = this.getDefaultSyncFromDate();

    if (!row) {
      return {
        enabled: true,
        host: null,
        user: null,
        passwordSet: false,
        syncFromDate: defaultFromDate,
      };
    }

    const config = row.config as {
      host?: string;
      user?: string;
      password?: string;
      syncDaysBack?: number;
      syncFromDate?: string;
    };
    const host = config?.host ?? null;
    const user = config?.user ?? null;
    const encryptedPassword = config?.password ?? null;
    const passwordSet = Boolean(encryptedPassword?.trim());
    const syncFromDate = this.parseSyncFromDate(
      config?.syncFromDate ?? config?.syncDaysBack,
    );

    return {
      enabled: row.enabled,
      host,
      user,
      passwordSet,
      syncFromDate,
    };
  }

  private getDefaultSyncFromDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }

  private parseSyncFromDate(value: string | number | undefined): string {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    if (typeof value === "number" && value >= 1) {
      const d = new Date();
      d.setDate(d.getDate() - value);
      return d.toISOString().slice(0, 10);
    }
    return this.getDefaultSyncFromDate();
  }

  /** Конфиг с паролем для проверки подключения (только для внутреннего использования) */
  async getFtpConfigWithPassword(workspaceId: string): Promise<{
    host: string;
    user: string;
    password: string;
  } | null> {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        FTP_INTEGRATION,
      );
    if (!row) return null;
    const config = row.config as {
      host?: string;
      user?: string;
      password?: string;
    };
    const host = config?.host?.trim();
    const user = config?.user?.trim();
    const encryptedPassword = config?.password;
    if (!host || !user || !encryptedPassword?.trim()) return null;
    const password = decrypt(encryptedPassword);
    return { host, user, password };
  }

  async updateSetting(
    key: string,
    value: string,
    description: string | null,
    workspaceId: string,
    username: string = "system",
  ): Promise<boolean> {
    const result = await this.promptsRepository.upsert(
      key,
      value,
      description,
      workspaceId,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Setting ${key} updated`,
        username,
        workspaceId,
      );
    }

    return result;
  }

  async updateFtpSettings(
    enabled: boolean,
    host: string,
    user: string,
    password: string | null,
    workspaceId: string,
    username: string = "system",
    syncFromDate?: string,
  ): Promise<boolean> {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        FTP_INTEGRATION,
      );
    const existingConfig = (row?.config ?? {}) as {
      host?: string;
      user?: string;
      password?: string;
      syncFromDate?: string;
    };
    const encryptedPassword = password
      ? encrypt(password)
      : (existingConfig.password ?? "");
    const validSyncFromDate =
      typeof syncFromDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(syncFromDate)
        ? syncFromDate
        : this.getDefaultSyncFromDate();
    const result = await this.workspaceIntegrationsRepository.upsert(
      workspaceId,
      FTP_INTEGRATION,
      enabled,
      {
        host,
        user,
        password: encryptedPassword,
        syncFromDate: validSyncFromDate,
      },
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `FTP ${enabled ? "включён" : "выключен"}, настройки обновлены`,
        username,
        workspaceId,
      );
    }

    return result;
  }

  async setFtpEnabled(
    workspaceId: string,
    enabled: boolean,
    username: string = "system",
  ): Promise<boolean> {
    const result = await this.workspaceIntegrationsRepository.setEnabled(
      workspaceId,
      FTP_INTEGRATION,
      enabled,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `FTP ${enabled ? "включён" : "выключен"}`,
        username,
        workspaceId,
      );
    }

    return result;
  }
}
