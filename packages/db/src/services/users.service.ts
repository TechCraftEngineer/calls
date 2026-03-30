/**
 * Users service - handles business logic for user operations
 */

import type { SystemRepository } from "../repositories/system.repository";
import { userWorkspaceSettingsRepository } from "../repositories/user-workspace-settings.repository";
import type { UsersRepository } from "../repositories/users.repository";
import type { User } from "../schema/types";
import type {
  CreateUserData,
  UpdateUserData,
  UserUpdateData,
} from "../types/users.types";
import {
  ValidationError,
  validateCreateUserData,
  validateUpdateUserData,
} from "../validators/user.validators";

export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.findAllActive();
  }

  async getUser(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  /** User + workspace settings flattened for edit form (camelCase) */
  async getUserForEdit(
    userId: string,
    workspaceId: string,
  ): Promise<{
    email: string;
    givenName: string;
    familyName: string;
    internalExtensions: string;
    mobilePhones: string;
    telegramChatId: string;
    telegramDailyReport: boolean;
    telegramManagerReport: boolean;
    maxChatId: string;
    maxDailyReport: boolean;
    maxManagerReport: boolean;
    filterExcludeAnsweringMachine: boolean;
    filterMinDuration: number;
    filterMinReplicas: number;
    emailDailyReport: boolean;
    emailWeeklyReport: boolean;
    emailMonthlyReport: boolean;
    telegramWeeklyReport: boolean;
    telegramMonthlyReport: boolean;
    telegramSkipWeekends: boolean;
    reportManagedUserIds: string[];
    kpiBaseSalary: number;
    kpiTargetBonus: number;
    kpiTargetTalkTimeMinutes: number;
    evaluationTemplateSlug: string | null;
    evaluationCustomInstructions: string | null;
    reportDetailed: boolean;
    reportIncludeCallSummaries: boolean;
    reportIncludeAvgRating: boolean;
    reportIncludeAvgValue: boolean;
  } | null> {
    const user = await this.usersRepository.findById(userId);
    if (!user) return null;

    const settings =
      await userWorkspaceSettingsRepository.findByUserAndWorkspace(
        userId,
        workspaceId,
      );

    const ns = settings?.notificationSettings as
      | {
          email?: {
            dailyReport?: boolean;
            weeklyReport?: boolean;
            monthlyReport?: boolean;
          };
          telegram?: {
            dailyReport?: boolean;
            managerReport?: boolean;
            weeklyReport?: boolean;
            monthlyReport?: boolean;
            skipWeekends?: boolean;
          };
          max?: {
            chatId?: string;
            dailyReport?: boolean;
            managerReport?: boolean;
          };
        }
      | undefined;
    const fs = settings?.filterSettings as
      | {
          excludeAnsweringMachine?: boolean;
          minDuration?: number;
          minReplicas?: number;
        }
      | undefined;
    const rs = settings?.reportSettings as
      | {
          includeCallSummaries?: boolean;
          detailed?: boolean;
          includeAvgValue?: boolean;
          includeAvgRating?: boolean;
          managedUserIds?: string[];
        }
      | undefined;
    const ks = settings?.kpiSettings as
      | {
          baseSalary?: number;
          targetBonus?: number;
          targetTalkTimeMinutes?: number;
        }
      | undefined;
    const es = settings?.evaluationSettings as
      | {
          templateSlug?: "sales" | "support" | "general";
          customInstructions?: string;
        }
      | null
      | undefined;

    const managedIds = rs?.managedUserIds;
    const reportManagedUserIds = Array.isArray(managedIds)
      ? managedIds
      : ([] as string[]);

    return {
      email: (user.email ?? "") as string,
      givenName: user.givenName ?? "",
      familyName: user.familyName ?? "",
      internalExtensions: user.internalExtensions ?? "",
      mobilePhones: user.mobilePhones ?? "",
      telegramChatId: user.telegramChatId ?? "",
      telegramDailyReport: ns?.telegram?.dailyReport ?? false,
      telegramManagerReport: ns?.telegram?.managerReport ?? false,
      maxChatId: ns?.max?.chatId ?? "",
      maxDailyReport: ns?.max?.dailyReport ?? false,
      maxManagerReport: ns?.max?.managerReport ?? false,
      filterExcludeAnsweringMachine: fs?.excludeAnsweringMachine ?? false,
      filterMinDuration: fs?.minDuration ?? 0,
      filterMinReplicas: fs?.minReplicas ?? 0,
      emailDailyReport: ns?.email?.dailyReport ?? false,
      emailWeeklyReport: ns?.email?.weeklyReport ?? false,
      emailMonthlyReport: ns?.email?.monthlyReport ?? false,
      telegramWeeklyReport: ns?.telegram?.weeklyReport ?? false,
      telegramMonthlyReport: ns?.telegram?.monthlyReport ?? false,
      telegramSkipWeekends: ns?.telegram?.skipWeekends ?? false,
      reportManagedUserIds,
      kpiBaseSalary: ks?.baseSalary ?? 0,
      kpiTargetBonus: ks?.targetBonus ?? 0,
      kpiTargetTalkTimeMinutes: ks?.targetTalkTimeMinutes ?? 0,
      evaluationTemplateSlug: es?.templateSlug ?? null,
      evaluationCustomInstructions: es?.customInstructions ?? null,
      reportDetailed: rs?.detailed ?? false,
      reportIncludeCallSummaries: rs?.includeCallSummaries ?? false,
      reportIncludeAvgRating: rs?.includeAvgRating ?? false,
      reportIncludeAvgValue: rs?.includeAvgValue ?? false,
    };
  }

  async createUser(
    data: CreateUserData,
    workspaceId?: string | null,
    actor?: string,
  ): Promise<string> {
    validateCreateUserData(data);

    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) {
      throw new ValidationError("Пользователь с таким email уже существует");
    }

    const userId = await this.usersRepository.create(data);

    await this.systemRepository.addActivityLog(
      "INFO",
      `User ${data.email} created`,
      actor || "admin",
      workspaceId,
    );

    return userId;
  }

  async updateUserName(userId: string, data: UpdateUserData): Promise<boolean> {
    validateUpdateUserData(data);

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new ValidationError("Пользователь не найден");
    }

    const result = await this.usersRepository.updateName(userId, data);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} name updated`,
        "admin",
      );
    }

    return result;
  }

  async updateUserInternalExtensions(
    userId: string,
    internalExtensions: string | null,
  ): Promise<boolean> {
    return this.usersRepository.updateInternalExtensions(
      userId,
      internalExtensions,
    );
  }

  async updateUserMobilePhones(
    userId: string,
    mobilePhones: string | null,
  ): Promise<boolean> {
    return this.usersRepository.updateMobilePhones(userId, mobilePhones);
  }

  async updateUserEmail(
    userId: string,
    email: string | null,
  ): Promise<boolean> {
    return this.usersRepository.updateEmail(userId, email);
  }

  async updateUserFilters(
    userId: string,
    workspaceId: string,
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.upsert(userId, workspaceId, {
      filterSettings: {
        excludeAnsweringMachine: filterExcludeAnsweringMachine,
        minDuration: filterMinDuration,
        minReplicas: filterMinReplicas,
      },
    });
  }

  async updateUserReportKpiSettings(
    userId: string,
    workspaceId: string,
    data: UserUpdateData,
  ): Promise<boolean> {
    const filterSettings: Partial<{
      excludeAnsweringMachine: boolean;
      minDuration: number;
      minReplicas: number;
    }> = {};
    const notificationSettings: Partial<{
      email: {
        dailyReport?: boolean;
        weeklyReport?: boolean;
        monthlyReport?: boolean;
      };
      telegram: {
        dailyReport?: boolean;
        managerReport?: boolean;
        weeklyReport?: boolean;
        monthlyReport?: boolean;
        skipWeekends?: boolean;
      };
      max: { chatId?: string; dailyReport?: boolean; managerReport?: boolean };
    }> = {};
    const reportSettings: Partial<{
      includeCallSummaries: boolean;
      detailed: boolean;
      includeAvgValue: boolean;
      includeAvgRating: boolean;
      managedUserIds: string[];
    }> = {};
    const kpiSettings: Partial<{
      baseSalary: number;
      targetBonus: number;
      targetTalkTimeMinutes: number;
    }> = {};

    if (data.filterExcludeAnsweringMachine !== undefined)
      filterSettings.excludeAnsweringMachine =
        data.filterExcludeAnsweringMachine;
    if (data.filterMinDuration !== undefined)
      filterSettings.minDuration = data.filterMinDuration;
    if (data.filterMinReplicas !== undefined)
      filterSettings.minReplicas = data.filterMinReplicas;

    if (data.telegramDailyReport !== undefined)
      notificationSettings.telegram = {
        ...notificationSettings.telegram,
        dailyReport: data.telegramDailyReport,
      };
    if (data.telegramManagerReport !== undefined)
      notificationSettings.telegram = {
        ...notificationSettings.telegram,
        managerReport: data.telegramManagerReport,
      };
    if (data.telegramWeeklyReport !== undefined)
      notificationSettings.telegram = {
        ...notificationSettings.telegram,
        weeklyReport: data.telegramWeeklyReport,
      };
    if (data.telegramMonthlyReport !== undefined)
      notificationSettings.telegram = {
        ...notificationSettings.telegram,
        monthlyReport: data.telegramMonthlyReport,
      };
    if (data.telegramSkipWeekends !== undefined)
      notificationSettings.telegram = {
        ...notificationSettings.telegram,
        skipWeekends: data.telegramSkipWeekends,
      };
    if (data.maxChatId !== undefined)
      notificationSettings.max = {
        ...notificationSettings.max,
        chatId: data.maxChatId?.trim() || undefined,
      };
    if (data.maxDailyReport !== undefined)
      notificationSettings.max = {
        ...notificationSettings.max,
        dailyReport: data.maxDailyReport,
      };
    if (data.maxManagerReport !== undefined)
      notificationSettings.max = {
        ...notificationSettings.max,
        managerReport: data.maxManagerReport,
      };
    if (data.emailDailyReport !== undefined)
      notificationSettings.email = {
        ...notificationSettings.email,
        dailyReport: data.emailDailyReport,
      };
    if (data.emailWeeklyReport !== undefined)
      notificationSettings.email = {
        ...notificationSettings.email,
        weeklyReport: data.emailWeeklyReport,
      };
    if (data.emailMonthlyReport !== undefined)
      notificationSettings.email = {
        ...notificationSettings.email,
        monthlyReport: data.emailMonthlyReport,
      };

    if (data.reportManagedUserIds !== undefined) {
      const v = data.reportManagedUserIds;
      reportSettings.managedUserIds = Array.isArray(v)
        ? v
        : typeof v === "string"
          ? (() => {
              try {
                const j = JSON.parse(v) as unknown;
                return Array.isArray(j) ? (j as string[]) : [];
              } catch {
                return [];
              }
            })()
          : [];
    }

    if (data.kpiBaseSalary !== undefined)
      kpiSettings.baseSalary = data.kpiBaseSalary;
    if (data.kpiTargetBonus !== undefined)
      kpiSettings.targetBonus = data.kpiTargetBonus;
    if (data.kpiTargetTalkTimeMinutes !== undefined)
      kpiSettings.targetTalkTimeMinutes = data.kpiTargetTalkTimeMinutes;

    const evaluationSettingsRaw =
      data.evaluationTemplateSlug !== undefined
        ? data.evaluationTemplateSlug === null
          ? null
          : {
              templateSlug: data.evaluationTemplateSlug,
              customInstructions:
                data.evaluationCustomInstructions?.trim() || undefined,
            }
        : undefined;

    const hasUpdates =
      Object.keys(filterSettings).length > 0 ||
      Object.keys(notificationSettings).length > 0 ||
      Object.keys(reportSettings).length > 0 ||
      Object.keys(kpiSettings).length > 0 ||
      evaluationSettingsRaw !== undefined;

    if (!hasUpdates) return true;

    const upsertData: Parameters<
      typeof userWorkspaceSettingsRepository.upsert
    >[2] = {
      filterSettings:
        Object.keys(filterSettings).length > 0 ? filterSettings : undefined,
      notificationSettings:
        Object.keys(notificationSettings).length > 0
          ? notificationSettings
          : undefined,
      reportSettings:
        Object.keys(reportSettings).length > 0 ? reportSettings : undefined,
      kpiSettings:
        Object.keys(kpiSettings).length > 0 ? kpiSettings : undefined,
    };
    if (evaluationSettingsRaw !== undefined) {
      upsertData.evaluationSettings = evaluationSettingsRaw;
    }

    const result = await userWorkspaceSettingsRepository.upsert(
      userId,
      workspaceId,
      upsertData,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} report/KPI settings updated`,
        "admin",
      );
    }

    return result;
  }

  async updateUserTelegramSettings(
    userId: string,
    workspaceId: string,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.upsert(userId, workspaceId, {
      notificationSettings: {
        telegram: {
          dailyReport: telegramDailyReport,
          managerReport: telegramManagerReport,
        },
      } as Partial<
        import("../schema/user/workspace-settings").NotificationSettings
      >,
    });
  }

  async updateUserPassword(
    userId: string,
    _newPassword: string,
  ): Promise<boolean> {
    await this.systemRepository.addActivityLog(
      "INFO",
      `User ${userId} password updated`,
      "admin",
    );
    return true;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await this.usersRepository.softDelete(userId);

    if (result) {
      await this.systemRepository.addActivityLog(
        "WARNING",
        `User ${userId} deactivated`,
        "admin",
      );
    }

    return result;
  }

  async saveTelegramConnectToken(
    userId: string,
    workspaceId: string,
    token: string,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.saveTelegramConnectToken(
      userId,
      workspaceId,
      token,
    );
  }

  async getUserByTelegramConnectToken(token: string): Promise<User | null> {
    const settings =
      await userWorkspaceSettingsRepository.findByTelegramConnectToken(token);
    if (!settings) return null;
    return this.usersRepository.findById(settings.userId);
  }

  async getWorkspaceIdByTelegramConnectToken(
    token: string,
  ): Promise<string | null> {
    const settings =
      await userWorkspaceSettingsRepository.findByTelegramConnectToken(token);
    return settings?.workspaceId ?? null;
  }

  async saveTelegramChatId(userId: string, chatId: string): Promise<boolean> {
    const result = await this.usersRepository.saveTelegramChatId(
      userId,
      chatId,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} Telegram connected`,
        "system",
      );
    }

    return result;
  }

  async saveMaxConnectToken(
    userId: string,
    workspaceId: string,
    token: string,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.saveMaxConnectToken(
      userId,
      workspaceId,
      token,
    );
  }

  async disconnectTelegram(userId: string): Promise<boolean> {
    const result = await this.usersRepository.disconnectTelegram(userId);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} Telegram disconnected`,
        "user",
      );
    }

    return result;
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
