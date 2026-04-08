/**
 * User integrations service - handles Telegram and MAX integrations
 */

import { userWorkspaceSettingsRepository } from "../../repositories/user-workspace-settings.repository";
import { withTransaction } from "../../repositories/workspaces.repository";
import type { UsersRepository } from "../../repositories/users.repository";
import type { SystemRepository } from "../../repositories/system.repository";
import type { User } from "./types";

export class UserIntegrationsService {
  constructor(
    private usersRepository: UsersRepository,
    private systemRepository: SystemRepository,
  ) {}

  // Telegram integration
  async saveTelegramConnectToken(
    userId: string,
    workspaceId: string,
    token: string,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.saveTelegramConnectToken(userId, workspaceId, token);
  }

  async getUserByTelegramConnectToken(token: string): Promise<User | null> {
    const settings = await userWorkspaceSettingsRepository.findByTelegramConnectToken(token);
    if (!settings) return null;
    return this.usersRepository.findById(settings.userId);
  }

  async getWorkspaceIdByTelegramConnectToken(token: string): Promise<string | null> {
    const settings = await userWorkspaceSettingsRepository.findByTelegramConnectToken(token);
    return settings?.workspaceId ?? null;
  }

  async saveTelegramChatId(userId: string, chatId: string): Promise<boolean> {
    const result = await this.usersRepository.saveTelegramChatId(userId, chatId);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} Telegram connected`,
        "system",
      );
    }

    return result;
  }

  async disconnectTelegram(userId: string): Promise<boolean> {
    return await withTransaction(async (tx) => {
      const result = await this.usersRepository.disconnectTelegram(userId, tx);

      // Also clear workspace-level Telegram connect token (atomic operation)
      await userWorkspaceSettingsRepository.disconnectTelegram(userId, tx);

      if (result) {
        await this.systemRepository.addActivityLog(
          "INFO",
          `User ${userId} Telegram disconnected`,
          "user",
        );
      }

      return result;
    });
  }

  // MAX integration
  async saveMaxConnectToken(
    userId: string,
    workspaceId: string,
    token: string,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.saveMaxConnectToken(userId, workspaceId, token);
  }

  async disconnectMax(userId: string): Promise<boolean> {
    const result = await userWorkspaceSettingsRepository.disconnectMax(userId);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} Max disconnected`,
        "user",
      );
    }

    return result;
  }
}
