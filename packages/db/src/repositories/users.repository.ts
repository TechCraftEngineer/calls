/**
 * Users repository - handles all database operations for users
 * Now using Better Auth schema with proper soft delete and UUID
 * Password management is handled by Better Auth Admin plugin
 */

import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type { CreateUserData, UpdateUserData } from "../types/users.types";

export const usersRepository = {
  async findById(id: string): Promise<schema.User | null> {
    const result = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, id as string))
      .limit(1);
    return result[0] ?? null;
  },

  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({ deletedAt: new Date() })
      .where(eq(schema.user.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async findByUsername(username: string): Promise<schema.User | null> {
    const result = await db
      .select()
      .from(schema.user)
      .where(
        and(eq(schema.user.username, username), isNull(schema.user.deletedAt)),
      )
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
      .where(
        and(eq(schema.user.username, username), isNull(schema.user.deletedAt)),
      )
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
        .where(isNull(schema.user.deletedAt))
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
    const fullName = data.familyName
      ? `${data.givenName} ${data.familyName}`.trim()
      : data.givenName;
    const userId = randomUUID();

    await db.insert(schema.user).values({
      id: userId,
      name: fullName,
      email: data.username,
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

  async updateEmail(userId: string, email: string | null): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({ email: email || undefined })
      .where(eq(schema.user.id, userId));
    return (result.rowCount ?? 0) > 0;
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
};

export type UsersRepository = typeof usersRepository;
