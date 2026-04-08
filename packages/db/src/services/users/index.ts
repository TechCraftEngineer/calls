import type { SystemRepository } from "../../repositories/system.repository";
import type { UserWorkspaceSettingsRepository } from "../../repositories/user-workspace-settings.repository";
import type { UsersRepository } from "../../repositories/users.repository";
import type { WorkspacesRepository } from "../../repositories/workspaces.repository";
import { UserBaseService } from "./user-base.service";
import { UserIntegrationsService } from "./user-integrations.service";
import { UserSettingsService } from "./user-settings.service";
import type { UserForEdit } from "./types";

export class UsersService {
  public readonly base: UserBaseService;
  public readonly settings: UserSettingsService;
  public readonly integrations: UserIntegrationsService;
  private workspacesRepository: WorkspacesRepository;
  private userWorkspaceSettingsRepository: UserWorkspaceSettingsRepository;

  constructor(
    usersRepository: UsersRepository,
    systemRepository: SystemRepository,
    workspacesRepository: WorkspacesRepository,
    userWorkspaceSettingsRepository: UserWorkspaceSettingsRepository,
  ) {
    this.base = new UserBaseService(usersRepository, systemRepository);
    this.settings = new UserSettingsService(systemRepository);
    this.integrations = new UserIntegrationsService(usersRepository, systemRepository);
    this.workspacesRepository = workspacesRepository;
    this.userWorkspaceSettingsRepository = userWorkspaceSettingsRepository;
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

  async getUserForEdit(userId: string, workspaceId: string): Promise<UserForEdit | null> {
    // Fetch user basic data
    const user = await this.base.getUser(userId);
    if (!user) {
      return null;
    }

    // Fetch user role in the workspace
    const member = await this.workspacesRepository.getMember(workspaceId, userId);
    const role = member?.role ?? "member";

    // Fetch user settings for the workspace
    const settings = await this.userWorkspaceSettingsRepository.findByUserAndWorkspace(
      userId,
      workspaceId,
    );

    // Delegate to settings service to build the UserForEdit object
    return this.settings.getUserForEdit(
      userId,
      workspaceId,
      {
        email: user.email ?? null,
        givenName: user.givenName ?? null,
        familyName: user.familyName ?? null,
        internalExtensions: user.internalExtensions ?? null,
        mobilePhones: user.mobilePhones ?? null,
        telegramChatId: user.telegramChatId ?? null,
      },
      role,
      settings,
    );
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
