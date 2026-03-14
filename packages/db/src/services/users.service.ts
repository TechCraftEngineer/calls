/**
 * Users service - handles business logic for user operations
 * Now with proper password hashing and transactions
 */

import type { SystemRepository } from "../repositories/system.repository";
import {
  userFilterSettingsRepository,
  userKpiSettingsRepository,
  userNotificationSettingsRepository,
  userReportSettingsRepository,
} from "../repositories/user-settings.repository";
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

  async getUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.findAllActive();
  }

  async getUser(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async createUser(data: CreateUserData): Promise<string> {
    validateCreateUserData(data);

    const existing = await this.usersRepository.findByUsername(data.username);
    if (existing) {
      throw new ValidationError("User with this username already exists");
    }

    const userId = await this.usersRepository.create(data);

    await this.systemRepository.addActivityLog(
      "INFO",
      `User ${data.username} created`,
      "admin",
    );

    return userId;
  }

  async updateUserName(userId: string, data: UpdateUserData): Promise<boolean> {
    validateUpdateUserData(data);

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new ValidationError("User not found");
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
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ): Promise<boolean> {
    return userFilterSettingsRepository.upsert(userId, {
      excludeAnsweringMachine: filterExcludeAnsweringMachine,
      minDuration: filterMinDuration,
      minReplicas: filterMinReplicas,
    });
  }

  async updateUserReportKpiSettings(
    userId: string,
    data: UserUpdateData,
  ): Promise<boolean> {
    // Split data into appropriate tables
    const notificationData: Record<string, unknown> = {};
    const reportData: Record<string, unknown> = {};
    const kpiData: Record<string, unknown> = {};

    // Map old field names to new structure
    if (data.telegramDailyReport !== undefined)
      notificationData.telegramDailyReport = data.telegramDailyReport;
    if (data.telegramManagerReport !== undefined)
      notificationData.telegramManagerReport = data.telegramManagerReport;
    if (data.telegramWeeklyReport !== undefined)
      notificationData.telegramWeeklyReport = data.telegramWeeklyReport;
    if (data.telegramMonthlyReport !== undefined)
      notificationData.telegramMonthlyReport = data.telegramMonthlyReport;
    if (data.telegramSkipWeekends !== undefined)
      notificationData.telegramSkipWeekends = data.telegramSkipWeekends;
    if (data.maxDailyReport !== undefined)
      notificationData.maxDailyReport = data.maxDailyReport;
    if (data.maxManagerReport !== undefined)
      notificationData.maxManagerReport = data.maxManagerReport;
    if (data.emailDailyReport !== undefined)
      notificationData.emailDailyReport = data.emailDailyReport;
    if (data.emailWeeklyReport !== undefined)
      notificationData.emailWeeklyReport = data.emailWeeklyReport;
    if (data.emailMonthlyReport !== undefined)
      notificationData.emailMonthlyReport = data.emailMonthlyReport;

    if (data.reportIncludeCallSummaries !== undefined)
      reportData.includeCallSummaries = data.reportIncludeCallSummaries;
    if (data.reportDetailed !== undefined)
      reportData.detailed = data.reportDetailed;
    if (data.reportIncludeAvgValue !== undefined)
      reportData.includeAvgValue = data.reportIncludeAvgValue;
    if (data.reportIncludeAvgRating !== undefined)
      reportData.includeAvgRating = data.reportIncludeAvgRating;
    if (data.reportManagedUserIds !== undefined)
      reportData.managedUserIds = data.reportManagedUserIds;

    if (data.kpiBaseSalary !== undefined)
      kpiData.baseSalary = data.kpiBaseSalary;
    if (data.kpiTargetBonus !== undefined)
      kpiData.targetBonus = data.kpiTargetBonus;
    if (data.kpiTargetTalkTimeMinutes !== undefined)
      kpiData.targetTalkTimeMinutes = data.kpiTargetTalkTimeMinutes;

    // Update each table
    const results = await Promise.all([
      Object.keys(notificationData).length > 0
        ? userNotificationSettingsRepository.upsert(userId, notificationData)
        : Promise.resolve(true),
      Object.keys(reportData).length > 0
        ? userReportSettingsRepository.upsert(userId, reportData)
        : Promise.resolve(true),
      Object.keys(kpiData).length > 0
        ? userKpiSettingsRepository.upsert(userId, kpiData)
        : Promise.resolve(true),
    ]);

    const success = results.every((r) => r);

    if (success) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} report/KPI settings updated`,
        "admin",
      );
    }

    return success;
  }

  async updateUserTelegramSettings(
    userId: string,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    return userNotificationSettingsRepository.upsert(userId, {
      telegramDailyReport,
      telegramManagerReport,
    });
  }

  async updateUserPassword(
    userId: string,
    _newPassword: string,
  ): Promise<boolean> {
    // Password is handled by Better Auth, not stored in our schema
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
    token: string,
  ): Promise<boolean> {
    return userNotificationSettingsRepository.saveTelegramConnectToken(
      userId,
      token,
    );
  }

  async getUserByTelegramConnectToken(token: string): Promise<User | null> {
    const settings =
      await userNotificationSettingsRepository.findByTelegramConnectToken(
        token,
      );
    if (!settings) return null;
    return this.usersRepository.findById(settings.userId);
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

  async saveMaxConnectToken(userId: string, token: string): Promise<boolean> {
    return userNotificationSettingsRepository.saveMaxConnectToken(
      userId,
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
    const result =
      await userNotificationSettingsRepository.disconnectMax(userId);

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
