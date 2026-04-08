/**
 * User base service - handles basic CRUD operations
 */

import type { UsersRepository } from "../../repositories/users.repository";
import type { SystemRepository } from "../../repositories/system.repository";
import type { CreateUserData, UpdateUserData } from "../../types/users.types";
import type { User } from "./types";
import {
  validateCreateUserData,
  validateUpdateUserData,
  ValidationError,
} from "../../validators/user.validators";

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
    // Password updates should be handled through Better Auth API
    // This method is a placeholder - use auth.api.setPassword or similar Better Auth endpoint
    throw new Error("Password updates must be done through Better Auth API, not directly through repository");
  }

  // Delete operations
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
}
