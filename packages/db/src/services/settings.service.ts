/**
 * Settings service - handles business logic for application settings
 */

import type { PromptsRepository } from "../repositories/prompts.repository";
import type { SystemRepository } from "../repositories/system.repository";

export class SettingsService {
  constructor(
    private promptsRepository: PromptsRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getSetting(key: string): Promise<string | null> {
    return this.promptsRepository.findByKeyWithDefault(key);
  }

  async getMegafonFtpSettings(): Promise<{
    host: string | null;
    user: string | null;
    password: string | null;
  }> {
    const [host, user, password] = await Promise.all([
      this.getSetting("megafon_ftp_host"),
      this.getSetting("megafon_ftp_user"),
      this.getSetting("megafon_ftp_password"),
    ]);

    return { host, user, password };
  }

  async updateSetting(
    key: string,
    value: string,
    description?: string | null,
  ): Promise<boolean> {
    const result = await this.promptsRepository.upsert(key, value, description);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Setting ${key} updated`,
        "admin",
      );
    }

    return result;
  }

  async updateMegafonFtpSettings(
    host: string,
    user: string,
    password: string,
  ): Promise<boolean> {
    const results = await Promise.all([
      this.updateSetting("megafon_ftp_host", host, "Megafon FTP host"),
      this.updateSetting("megafon_ftp_user", user, "Megafon FTP user"),
      this.updateSetting(
        "megafon_ftp_password",
        password,
        "Megafon FTP password",
      ),
    ]);

    return results.every(Boolean);
  }
}
