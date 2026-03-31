/**
 * Settings service - handles business logic for application settings
 */

import { env } from "@calls/config";
import { decrypt, encrypt } from "../lib/encryption";
import type { SystemRepository } from "../repositories/system.repository";
import type { WorkspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";
import type { WorkspaceSettingsRepository } from "../repositories/workspace-settings.repository";

const FTP_INTEGRATION = "ftp" as const;

/** Минимальная длина токена бота (консервативное значение для Telegram/MAX) */
const BOT_TOKEN_MIN_LENGTH = 10;

const BOT_KEY_TO_TYPE: Record<string, "telegram" | "max"> = {
  telegram_bot_token: "telegram",
  max_bot_token: "max",
};

function isValidTelegramToken(token: string): boolean {
  return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
}

export class SettingsService {
  constructor(
    private workspaceSettingsRepository: WorkspaceSettingsRepository,
    private systemRepository: SystemRepository,
    private workspaceIntegrationsRepository: WorkspaceIntegrationsRepository,
  ) {}

  async getSetting(key: string, workspaceId: string): Promise<string | null> {
    return this.workspaceSettingsRepository.findByKeyWithDefault(
      key,
      workspaceId,
    );
  }

  /** Токен бота в расшифрованном виде (для Telegram, MAX и др.) */
  async getDecryptedBotToken(
    key: string,
    workspaceId: string,
  ): Promise<string | null> {
    try {
      const botType = BOT_KEY_TO_TYPE[key];
      if (!botType) {
        console.warn(`Unknown bot token key: ${key}`);
        return null;
      }

      const raw = await this.workspaceIntegrationsRepository.getBotToken(
        workspaceId,
        botType,
      );

      if (!raw?.trim()) {
        return null;
      }

      const decrypted = decrypt(raw);
      if (!decrypted?.trim()) {
        console.warn(
          `Failed to decrypt bot token for key: ${key}, workspace: ${workspaceId}`,
        );
        return null;
      }

      return decrypted;
    } catch (error) {
      console.error(
        `Error decrypting bot token for key: ${key}, workspace: ${workspaceId}`,
        error,
      );
      return null;
    }
  }

  /** Сохранить токен бота в зашифрованном виде */
  async updateBotToken(
    key: string,
    value: string,
    description: string,
    workspaceId: string,
  ): Promise<boolean> {
    try {
      const botType = BOT_KEY_TO_TYPE[key];
      if (!botType) {
        console.error(`Unknown bot token key: ${key}`);
        return false;
      }

      // Handle empty/null values properly
      if (!value?.trim()) {
        console.log(
          `Removing bot token for key: ${key}, workspace: ${workspaceId}`,
        );
        return this.workspaceIntegrationsRepository.upsertBotToken(
          workspaceId,
          botType,
          "",
          description,
        );
      }

      const trimmedValue = value.trim();

      // Basic validation for bot tokens
      if (trimmedValue.length < BOT_TOKEN_MIN_LENGTH) {
        console.error(
          `Bot token too short for key: ${key}, workspace: ${workspaceId}`,
        );
        return false;
      }

      const encrypted = encrypt(trimmedValue);
      if (!encrypted) {
        console.error(
          `Failed to encrypt bot token for key: ${key}, workspace: ${workspaceId}`,
        );
        return false;
      }

      const result = await this.workspaceIntegrationsRepository.upsertBotToken(
        workspaceId,
        botType,
        encrypted,
        description,
      );

      if (result) {
        console.log(
          `Successfully updated bot token for key: ${key}, workspace: ${workspaceId}`,
        );
      } else {
        console.error(
          `Failed to save bot token for key: ${key}, workspace: ${workspaceId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `Error updating bot token for key: ${key}, workspace: ${workspaceId}`,
        error,
      );
      return false;
    }
  }

  /** Workspace IDs с настроенным Telegram ботом */
  async getWorkspaceIdsWithTelegramBot(): Promise<string[]> {
    return this.workspaceIntegrationsRepository.findWorkspaceIdsWithTelegramBot();
  }

  /**
   * Возвращает Telegram-токен для workspace с fallback на системный токен.
   * Приоритет: 1) токен workspace, 2) env.TELEGRAM_BOT_TOKEN.
   */
  async getEffectiveTelegramBotToken(workspaceId: string): Promise<{
    token: string | null;
    source: "workspace" | "system" | "none";
  }> {
    const workspaceTokenRaw = await this.getDecryptedBotToken(
      "telegram_bot_token",
      workspaceId,
    );
    const workspaceToken = workspaceTokenRaw?.trim();
    if (workspaceToken && isValidTelegramToken(workspaceToken)) {
      return { token: workspaceToken, source: "workspace" };
    }

    const systemToken = env.TELEGRAM_BOT_TOKEN?.trim();
    if (systemToken && isValidTelegramToken(systemToken)) {
      return { token: systemToken, source: "system" };
    }

    return { token: null, source: "none" };
  }

  /** Список активных интеграций FTP по всем workspace */
  async getActiveFtpIntegrations(): Promise<
    Array<{
      workspaceId: string;
      host: string;
      user: string;
      password: string;
      syncFromDate: string;
      excludePhoneNumbers: string[];
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
    /** Номера телефонов, исключённые из загрузки и анализа */
    excludePhoneNumbers: string[];
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
        excludePhoneNumbers: [],
      };
    }

    const config = row.config as {
      host?: string;
      user?: string;
      password?: string;
      syncDaysBack?: number;
      syncFromDate?: string;
      excludePhoneNumbers?: string[];
    };
    const host = config?.host ?? null;
    const user = config?.user ?? null;
    const encryptedPassword = config?.password ?? null;
    const passwordSet = Boolean(encryptedPassword?.trim());
    const syncFromDate = this.parseSyncFromDate(
      config?.syncFromDate ?? config?.syncDaysBack,
    );
    const excludePhoneNumbers = Array.isArray(config?.excludePhoneNumbers)
      ? config.excludePhoneNumbers.filter(
          (n): n is string => typeof n === "string" && n.trim() !== "",
        )
      : [];

    return {
      enabled: row.enabled,
      host,
      user,
      passwordSet,
      syncFromDate,
      excludePhoneNumbers,
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
    const result = await this.workspaceSettingsRepository.upsert(
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
    excludePhoneNumbers?: string[],
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
      excludePhoneNumbers?: string[];
    };
    const encryptedPassword = password
      ? encrypt(password)
      : (existingConfig.password ?? "");
    const validSyncFromDate =
      typeof syncFromDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(syncFromDate)
        ? syncFromDate
        : this.getDefaultSyncFromDate();
    const validExcludePhoneNumbers = Array.isArray(excludePhoneNumbers)
      ? excludePhoneNumbers
          .map((n) => (typeof n === "string" ? n.trim() : ""))
          .filter(Boolean)
      : (existingConfig.excludePhoneNumbers ?? []);
    const result = await this.workspaceIntegrationsRepository.upsert(
      workspaceId,
      FTP_INTEGRATION,
      enabled,
      {
        host,
        user,
        password: encryptedPassword,
        syncFromDate: validSyncFromDate,
        excludePhoneNumbers: validExcludePhoneNumbers,
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
