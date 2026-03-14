/**
 * Settings service - handles business logic for application settings
 */

import { validateMegafonSettings } from "../lib/validation";
import type { PromptsRepository } from "../repositories/prompts.repository";
import type { SystemRepository } from "../repositories/system.repository";

export class SettingsService {
  constructor(
    private promptsRepository: PromptsRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getSetting(key: string, workspaceId: string): Promise<string | null> {
    return this.promptsRepository.findByKeyWithDefault(key, workspaceId);
  }

  async getMegafonFtpSettings(workspaceId: string): Promise<{
    host: string | null;
    user: string | null;
    password: string | null;
  }> {
    const [host, user, password] = await Promise.all([
      this.getSetting("megafon_ftp_host", workspaceId),
      this.getSetting("megafon_ftp_user", workspaceId),
      this.getSetting("megafon_ftp_password", workspaceId),
    ]);

    // Validate settings if all are present
    if (host && user && password) {
      try {
        const validated = validateMegafonSettings({ host, user, password });
        return validated;
      } catch {
        // If validation fails, return null values to indicate misconfiguration
        return { host: null, user: null, password: null };
      }
    }

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

  async updateMegafonFtpSettings(
    host: string,
    user: string,
    password: string,
    workspaceId: string,
    username: string = "system",
  ): Promise<boolean> {
    const results = await Promise.all([
      this.updateSetting(
        "megafon_ftp_host",
        host,
        "Megafon FTP host",
        workspaceId,
        username,
      ),
      this.updateSetting(
        "megafon_ftp_user",
        user,
        "Megafon FTP user",
        workspaceId,
        username,
      ),
      this.updateSetting(
        "megafon_ftp_password",
        password,
        "Megafon FTP password",
        workspaceId,
        username,
      ),
    ]);

    return results.every(Boolean);
  }
}
