/**
 * Users service - refactored into modular components
 */

import type { UsersRepository } from "../../repositories/users.repository";
import type { SystemRepository } from "../../repositories/system.repository";
import { UserBaseService } from "./user-base.service";
import { UserSettingsService } from "./user-settings.service";
import { UserIntegrationsService } from "./user-integrations.service";

// Export types
export type { User, WorkspaceMember, UserForEdit, UserUpdateData } from "./types";

// Export services
export { UserBaseService } from "./user-base.service";
export { UserSettingsService } from "./user-settings.service";
export { UserIntegrationsService } from "./user-integrations.service";

/**
 * Unified Users Service - facade that delegates to specialized services
 * This maintains backward compatibility while providing modular architecture
 */
export class UsersService {
  public readonly base: UserBaseService;
  public readonly settings: UserSettingsService;
  public readonly integrations: UserIntegrationsService;

  constructor(
    private usersRepository: UsersRepository,
    private systemRepository: SystemRepository,
  ) {
    this.base = new UserBaseService(usersRepository, systemRepository);
    this.settings = new UserSettingsService(systemRepository);
    this.integrations = new UserIntegrationsService(usersRepository, systemRepository);
  }

  // === Delegate base methods for backward compatibility ===

  async getUserByEmail(email: string) {
    return this.base.getUserByEmail(email);
  }

  async getAllUsers() {
    return this.base.getAllUsers();
  }

  async getUser(id: string) {
    return this.base.getUser(id);
  }

  async createUser(
    data: import("../../types/users.types").CreateUserData,
    workspaceId?: string | null,
    actor?: string,
  ) {
    return this.base.createUser(data, workspaceId, actor);
  }

  async updateUserName(userId: string, data: import("../../types/users.types").UpdateUserData) {
    return this.base.updateUserName(userId, data);
  }

  async updateUserInternalExtensions(userId: string, internalExtensions: string | null) {
    return this.base.updateUserInternalExtensions(userId, internalExtensions);
  }

  async updateUserMobilePhones(userId: string, mobilePhones: string | null) {
    return this.base.updateUserMobilePhones(userId, mobilePhones);
  }

  async updateUserEmail(userId: string, email: string | null) {
    return this.base.updateUserEmail(userId, email);
  }

  async updateUserPassword(userId: string, newPassword: string) {
    return this.base.updateUserPassword(userId, newPassword);
  }

  async deleteUser(userId: string) {
    return this.base.deleteUser(userId);
  }

  // === Delegate settings methods ===

  async getUserForEdit(
    userId: string,
    workspaceId: string,
    user: {
      email: string | null;
      givenName: string | null;
      familyName: string | null;
      internalExtensions: string | null;
      mobilePhones: string | null;
      telegramChatId: string | null;
    },
    role: string,
    settings: {
      notificationSettings?: unknown;
      filterSettings?: unknown;
      reportSettings?: unknown;
      kpiSettings?: unknown;
      evaluationSettings?: unknown;
    } | null,
  ) {
    return this.settings.getUserForEdit(userId, workspaceId, user, role, settings);
  }

  async updateUserFilters(
    userId: string,
    workspaceId: string,
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ) {
    return this.settings.updateUserFilters(
      userId,
      workspaceId,
      filterExcludeAnsweringMachine,
      filterMinDuration,
      filterMinReplicas,
    );
  }

  async updateUserReportKpiSettings(
    userId: string,
    workspaceId: string,
    data: import("./types").UserUpdateData,
  ) {
    return this.settings.updateUserReportKpiSettings(userId, workspaceId, data);
  }

  async updateUserTelegramSettings(
    userId: string,
    workspaceId: string,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ) {
    return this.settings.updateUserTelegramSettings(
      userId,
      workspaceId,
      telegramDailyReport,
      telegramManagerReport,
    );
  }

  // === Delegate integration methods ===

  async saveTelegramConnectToken(userId: string, workspaceId: string, token: string) {
    return this.integrations.saveTelegramConnectToken(userId, workspaceId, token);
  }

  async getUserByTelegramConnectToken(token: string) {
    return this.integrations.getUserByTelegramConnectToken(token);
  }

  async getWorkspaceIdByTelegramConnectToken(token: string) {
    return this.integrations.getWorkspaceIdByTelegramConnectToken(token);
  }

  async saveTelegramChatId(userId: string, chatId: string) {
    return this.integrations.saveTelegramChatId(userId, chatId);
  }

  async saveMaxConnectToken(userId: string, workspaceId: string, token: string) {
    return this.integrations.saveMaxConnectToken(userId, workspaceId, token);
  }

  async disconnectTelegram(userId: string) {
    return this.integrations.disconnectTelegram(userId);
  }

  async disconnectMax(userId: string) {
    return this.integrations.disconnectMax(userId);
  }
}
