/**
 * User base service - handles basic CRUD operations
 */

import type { SystemRepository } from "../../repositories/system.repository";
import type { UsersRepository } from "../../repositories/users.repository";
import type { CreateUserData, UpdateUserData } from "../../types/users.types";
import {
  ValidationError,
  validateCreateUserData,
  validateUpdateUserData,
} from "../../validators/user.validators";
import type { User } from "./types";

export class UserBaseService {
  constructor(
    private usersRepository: UsersRepository,
    private systemRepository: SystemRepository,
  ) {}

  // Read operations
  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.findAllActive();
  }

  async getUser(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  // Create operations
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
      `User ${userId} created`,
      actor || "admin",
      workspaceId,
    );

    return userId;
  }

  // Update operations
  async updateUserName(userId: string, data: UpdateUserData): Promise<boolean> {
    validateUpdateUserData(data);

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new ValidationError("Пользователь не найден");
    }

    const result = await this.usersRepository.updateName(userId, data);

    if (result) {
      await this.systemRepository.addActivityLog("INFO", `User ${userId} name updated`, "admin");
    }

    return result;
  }

  async updateUserInternalExtensions(
    userId: string,
    internalExtensions: string | null,
  ): Promise<boolean> {
    return this.usersRepository.updateInternalExtensions(userId, internalExtensions);
  }

  async updateUserMobilePhones(userId: string, mobilePhones: string | null): Promise<boolean> {
    return this.usersRepository.updateMobilePhones(userId, mobilePhones);
  }

  async updateUserEmail(userId: string, email: string | null): Promise<boolean> {
    return this.usersRepository.updateEmail(userId, email);
  }

  async updateUserPassword(_userId: string, _newPassword: string): Promise<boolean> {
    // Обновление пароля должно выполняться через Better Auth API
    // Этот метод - placeholder, используйте auth.api.setPassword или аналогичный Better Auth endpoint
    throw new Error(
      "Обновление пароля должно выполняться через Better Auth API, не напрямую через репозиторий",
    );
  }

  // Delete operations
  async deleteUser(userId: string): Promise<boolean> {
    const result = await this.usersRepository.softDelete(userId);

    if (result) {
      await this.systemRepository.addActivityLog("WARNING", `User ${userId} deactivated`, "admin");
    }

    return result;
  }
}
