/**
 * Users service - handles business logic for user operations
 */

import type { SystemRepository } from "../repositories/system.repository";
import type { UsersRepository } from "../repositories/users.repository";
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

  async getUserByUsername(username: string): Promise<any | null> {
    return this.usersRepository.findWithAllData(username);
  }

  async getAllUsers(): Promise<any[]> {
    return this.usersRepository.findAllActive();
  }

  async getUser(id: string): Promise<any | null> {
    return this.usersRepository.findById(id);
  }

  async createUser(data: CreateUserData): Promise<string> {
    // Валидация входных данных
    validateCreateUserData(data);

    // Проверка существования пользователя
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
    // Валидация входных данных
    validateUpdateUserData(data);

    // Проверка существования пользователя
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

  async updateUserFilters(
    userId: string,
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ): Promise<boolean> {
    return this.usersRepository.updateFilters(
      userId,
      filterExcludeAnsweringMachine,
      filterMinDuration,
      filterMinReplicas,
    );
  }

  async updateUserReportKpiSettings(
    userId: string,
    data: UserUpdateData,
  ): Promise<boolean> {
    const result = await this.usersRepository.updateReportAndKpiSettings(
      userId,
      data,
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
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    return this.usersRepository.updateTelegramSettings(
      userId,
      telegramDailyReport,
      telegramManagerReport,
    );
  }

  async updateUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<boolean> {
    const result = await this.usersRepository.updatePassword(
      userId,
      newPassword,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} password updated`,
        "admin",
      );
    }

    return result;
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
    return this.usersRepository.saveTelegramConnectToken(userId, token);
  }

  async getUserByTelegramConnectToken(token: string): Promise<any | null> {
    return this.usersRepository.findByTelegramConnectToken(token);
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
    return this.usersRepository.saveMaxConnectToken(userId, token);
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
    const result = await this.usersRepository.disconnectMax(userId);

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
