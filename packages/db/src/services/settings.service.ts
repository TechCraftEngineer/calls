/**
 * Settings service - handles business logic for application settings
 */

import { decrypt, encrypt } from "../lib/encryption";
import { validateMegafonSettings } from "../lib/validation";
import type { PromptsRepository } from "../repositories/prompts.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { WorkspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";

const MEGAFON_FTP = "megafon_ftp" as const;

export class SettingsService {
  constructor(
    private promptsRepository: PromptsRepository,
    private systemRepository: SystemRepository,
    private workspaceIntegrationsRepository: WorkspaceIntegrationsRepository,
  ) {}

  async getSetting(key: string, workspaceId: string): Promise<string | null> {
    return this.promptsRepository.findByKeyWithDefault(key, workspaceId);
  }

  /** Список активных интеграций Megafon FTP по всем workspace */
  async getActiveMegafonFtpIntegrations(): Promise<
    Array<{ workspaceId: string; host: string; user: string; password: string }>
  > {
    const rows =
      await this.workspaceIntegrationsRepository.listActiveMegafonFtp();
    return rows.map((r) => ({
      ...r,
      password: decrypt(r.password),
    }));
  }

  async getMegafonFtpSettings(workspaceId: string): Promise<{
    enabled: boolean;
    host: string | null;
    user: string | null;
    password: string | null;
  }> {
    const row =
      await this.workspaceIntegrationsRepository.getByWorkspaceAndType(
        workspaceId,
        MEGAFON_FTP,
      );

    if (!row) {
      return { enabled: false, host: null, user: null, password: null };
    }

    const config = row.config as {
      host?: string;
      user?: string;
      password?: string;
    };
    const host = config?.host ?? null;
    const user = config?.user ?? null;
    const encryptedPassword = config?.password ?? null;
    const password = encryptedPassword ? decrypt(encryptedPassword) : null;

    if (host && user && password) {
      try {
        const validated = validateMegafonSettings({ host, user, password });
        return {
          enabled: row.enabled,
          host: validated.host,
          user: validated.user,
          password: validated.password,
        };
      } catch {
        return {
          enabled: row.enabled,
          host: null,
          user: null,
          password: null,
        };
      }
    }

    return {
      enabled: row.enabled,
      host,
      user,
      password,
    };
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

  async updateMegafonFtpSettings(
    enabled: boolean,
    host: string,
    user: string,
    password: string,
    workspaceId: string,
    username: string = "system",
  ): Promise<boolean> {
    const encryptedPassword = password ? encrypt(password) : "";
    const result = await this.workspaceIntegrationsRepository.upsert(
      workspaceId,
      MEGAFON_FTP,
      enabled,
      { host, user, password: encryptedPassword },
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Megafon FTP ${enabled ? "включён" : "выключен"}, настройки обновлены`,
        username,
        workspaceId,
      );
    }

    return result;
  }

  async setMegafonFtpEnabled(
    workspaceId: string,
    enabled: boolean,
    username: string = "system",
  ): Promise<boolean> {
    const result = await this.workspaceIntegrationsRepository.setEnabled(
      workspaceId,
      MEGAFON_FTP,
      enabled,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Megafon FTP ${enabled ? "включён" : "выключен"}`,
        username,
        workspaceId,
      );
    }

    return result;
  }
}
