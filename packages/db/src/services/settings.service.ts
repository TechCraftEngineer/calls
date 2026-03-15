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

  /** Список активных интеграций FTP по всем workspace */
  async getActiveFtpIntegrations(): Promise<
    Array<{ workspaceId: string; host: string; user: string; password: string }>
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
  }> {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        FTP_INTEGRATION,
      );

    if (!row) {
      return { enabled: true, host: null, user: null, passwordSet: false };
    }

    const config = row.config as {
      host?: string;
      user?: string;
      password?: string;
    };
    const host = config?.host ?? null;
    const user = config?.user ?? null;
    const encryptedPassword = config?.password ?? null;
    const passwordSet = Boolean(encryptedPassword?.trim());

    return {
      enabled: row.enabled,
      host,
      user,
      passwordSet,
    };
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
    };
    const encryptedPassword = password
      ? encrypt(password)
      : (existingConfig.password ?? "");
    const result = await this.workspaceIntegrationsRepository.upsert(
      workspaceId,
      FTP_INTEGRATION,
      enabled,
      { host, user, password: encryptedPassword },
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
