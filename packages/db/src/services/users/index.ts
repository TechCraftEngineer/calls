import { z } from "zod";
import type { SystemRepository } from "../../repositories/system.repository";
import type { UserWorkspaceSettingsRepository } from "../../repositories/user-workspace-settings.repository";
import type { UsersRepository } from "../../repositories/users.repository";
import type { WorkspacesRepository } from "../../repositories/workspaces.repository";
import type { CreateUserData, UpdateUserData, UserUpdateData } from "../../types/users.types";
import type { UserForEdit } from "./types";
import { UserBaseService } from "./user-base.service";
import { UserIntegrationsService } from "./user-integrations.service";
import { UserSettingsService } from "./user-settings.service";

// Zod validation schemas
const UuidSchema = z.uuid();
const EmailSchema = z.email().max(255);
const NameSchema = z.string().min(1).max(100);
const OptionalStringSchema = z.string().max(255).nullable();

const CreateUserDataSchema = z.object({
  email: EmailSchema,
  givenName: NameSchema.optional(),
  familyName: NameSchema.optional(),
  internalExtensions: z.string().max(255).nullable().optional(),
  mobilePhones: z.string().max(255).nullable().optional(),
  password: z.string().min(8).max(100).optional(),
});

const UpdateUserDataSchema = z.object({
  givenName: NameSchema.optional(),
  familyName: NameSchema.optional(),
});

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

  async createUser(data: CreateUserData, workspaceId?: string | null, actor?: string) {
    // Validate input data with Zod
    const validatedData = CreateUserDataSchema.parse(data);
    if (workspaceId !== undefined && workspaceId !== null) {
      UuidSchema.parse(workspaceId);
    }
    if (actor !== undefined) {
      UuidSchema.parse(actor);
    }
    return this.base.createUser(validatedData as CreateUserData, workspaceId, actor);
  }

  async updateUserName(userId: string, data: UpdateUserData) {
    UuidSchema.parse(userId);
    const validatedData = UpdateUserDataSchema.parse(data);
    return this.base.updateUserName(userId, validatedData as UpdateUserData);
  }

  async updateUserInternalExtensions(userId: string, internalExtensions: string | null) {
    UuidSchema.parse(userId);
    OptionalStringSchema.parse(internalExtensions);
    return this.base.updateUserInternalExtensions(userId, internalExtensions);
  }

  async updateUserMobilePhones(userId: string, mobilePhones: string | null) {
    UuidSchema.parse(userId);
    OptionalStringSchema.parse(mobilePhones);
    return this.base.updateUserMobilePhones(userId, mobilePhones);
  }

  async updateUserEmail(userId: string, email: string | null) {
    UuidSchema.parse(userId);
    if (email !== null) {
      EmailSchema.parse(email);
    }
    return this.base.updateUserEmail(userId, email);
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    UuidSchema.parse(userId);
    z.string().min(8).max(100).parse(newPassword);
    // Обновление пароля должно выполняться через Better Auth API, не напрямую через сервис
    throw new Error(
      "Обновление пароля должно выполняться через Better Auth API, не напрямую через сервис",
    );
  }

  async deleteUser(userId: string) {
    UuidSchema.parse(userId);
    return this.base.deleteUser(userId);
  }

  // === Delegate settings methods ===

  async getUserForEdit(userId: string, workspaceId: string): Promise<UserForEdit | null> {
    // Validate input IDs before any repository calls
    UuidSchema.parse(userId);
    UuidSchema.parse(workspaceId);

    // Fetch user basic data
    const user = await this.base.getUser(userId);
    if (!user) {
      return null;
    }

    // Fetch member and settings in parallel
    const [member, settings] = await Promise.all([
      this.workspacesRepository.getMember(workspaceId, userId),
      this.userWorkspaceSettingsRepository.findByUserAndWorkspace(userId, workspaceId),
    ]);

    if (!member) {
      return null; // User is not a member of this workspace
    }
    const role = member.role;

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

  async updateUserReportKpiSettings(userId: string, workspaceId: string, data: UserUpdateData) {
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
