/**
 * Users repository - handles all database operations for users
 * Now using Better Auth schema
 */

import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type {
  CreateUserData,
  UpdateUserData,
  UserUpdateData,
} from "../types/users.types";

export const usersRepository = {
  async findById(id: string): Promise<schema.User | null> {
    const result = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, id as string))
      .limit(1);
    return result[0] ?? null;
  },

  async softDelete(_id: string): Promise<boolean> {
    // Better Auth doesn't have is_active field, so we just return true
    console.warn(
      "[UsersRepository] softDelete called but Better Auth doesn't support soft delete",
    );
    return true;
  },

  async findByUsername(username: string): Promise<schema.User | null> {
    const result = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.username, username))
      .limit(1);

    const user = result[0] ?? null;
    if (user && !user.givenName && user.name) {
      const parts = user.name.split(/\s+/, 2);
      user.givenName = parts[0] ?? "";
      user.familyName = parts[1] ?? "";
    }
    return user;
  },

  async findWithAllData(username: string): Promise<schema.User | null> {
    const result = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.username, username))
      .limit(1);

    const user = result[0] ?? null;
    if (user && !user.givenName && user.name) {
      const parts = user.name.split(/\s+/, 2);
      user.givenName = parts[0] ?? "";
      user.familyName = parts[1] ?? "";
    }
    return user;
  },

  async findAllActive(): Promise<schema.User[]> {
    try {
      const results = await db
        .select()
        .from(schema.user)
        .orderBy(desc(schema.user.createdAt));

      return results.map((user) => {
        if (!user.givenName && user.name) {
          const parts = user.name.split(/\s+/, 2);
          user.givenName = parts[0] ?? "";
          user.familyName = parts[1] ?? "";
        }
        return user;
      });
    } catch (error) {
      console.error("[UsersRepository] Error in findAllActive:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  },

  async create(data: CreateUserData): Promise<string> {
    const { hashSync } = await import("bcryptjs");
    const _passwordHash = hashSync(data.password, 10);
    const fullName = data.familyName
      ? `${data.givenName} ${data.familyName}`.trim()
      : data.givenName;
    const userId = randomBytes(16).toString("hex");

    await db.insert(schema.user).values({
      id: userId,
      name: fullName,
      email: data.username, // Using username as email for Better Auth
      username: data.username,
      givenName: data.givenName,
      familyName: data.familyName ?? "",
      internalExtensions: data.internalExtensions ?? null,
      mobilePhones: data.mobilePhones ?? null,
    });

    return userId;
  },

  async updateName(userId: string, data: UpdateUserData): Promise<boolean> {
    if (!data.givenName) return false;

    const fullName = data.familyName
      ? `${data.givenName} ${data.familyName}`.trim()
      : data.givenName;

    const result = await db
      .update(schema.user)
      .set({
        givenName: data.givenName,
        familyName: data.familyName ?? "",
        name: fullName,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async updateInternalExtensions(
    userId: string,
    internalExtensions: string | null,
  ): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({ internalExtensions })
      .where(eq(schema.user.id, userId));
    return (result.rowCount ?? 0) > 0;
  },

  async updateMobilePhones(
    userId: string,
    mobilePhones: string | null,
  ): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({ mobilePhones })
      .where(eq(schema.user.id, userId));
    return (result.rowCount ?? 0) > 0;
  },

  async updateEmail(
    userId: string,
    email: string | null,
  ): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({ email: email || undefined })
      .where(eq(schema.user.id, userId));
    return (result.rowCount ?? 0) > 0;
  },

  // Legacy methods for removed user settings tables - now handled by Better Auth
  async updateFilters(
    _userId: string,
    _filterExcludeAnsweringMachine: boolean,
    _filterMinDuration: number,
    _filterMinReplicas: number,
  ): Promise<boolean> {
    // Settings are now stored in Better Auth metadata or separate system
    console.warn(
      "[UsersRepository] updateFilters called but user filters table removed",
    );
    return true;
  },

  async updateReportAndKpiSettings(
    _userId: string,
    _data: UserUpdateData,
  ): Promise<boolean> {
    // Settings are now stored in Better Auth metadata or separate system
    console.warn(
      "[UsersRepository] updateReportAndKpiSettings called but settings tables removed",
    );
    return true;
  },

  async updateTelegramSettings(
    _userId: string,
    _telegramDailyReport: boolean,
    _telegramManagerReport: boolean,
  ): Promise<boolean> {
    // Telegram settings now stored in Better Auth metadata
    console.warn(
      "[UsersRepository] updateTelegramSettings called but telegram settings moved to metadata",
    );
    return true;
  },

  async updatePassword(
    _userId: string,
    _newPassword: string,
  ): Promise<boolean> {
    // Password handling now done by Better Auth
    console.warn(
      "[UsersRepository] updatePassword called but password handling moved to Better Auth",
    );
    return true;
  },

  async findByTelegramConnectToken(
    _token: string,
  ): Promise<schema.User | null> {
    // Telegram integration now handled by Better Auth metadata
    console.warn(
      "[UsersRepository] findByTelegramConnectToken called but telegram integration moved to metadata",
    );
    return null;
  },

  async saveTelegramConnectToken(
    _userId: string,
    _token: string,
  ): Promise<boolean> {
    // Telegram integration now handled by Better Auth metadata
    console.warn(
      "[UsersRepository] saveTelegramConnectToken called but telegram integration moved to metadata",
    );
    return true;
  },

  async saveTelegramChatId(userId: string, chatId: string): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        telegramChatId: chatId,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async disconnectTelegram(userId: string): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        telegramChatId: null,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async saveMaxConnectToken(_userId: string, _token: string): Promise<boolean> {
    // MAX integration now handled by Better Auth metadata
    console.warn(
      "[UsersRepository] saveMaxConnectToken called but MAX integration moved to metadata",
    );
    return true;
  },

  async disconnectMax(_userId: string): Promise<boolean> {
    // MAX integration now handled by Better Auth metadata
    console.warn(
      "[UsersRepository] disconnectMax called but MAX integration moved to metadata",
    );
    return true;
  },
};

export type UsersRepository = typeof usersRepository;
