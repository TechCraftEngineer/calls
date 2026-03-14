/**
 * Users repository - handles all database operations for users
 * Now using Better Auth schema
 */

import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
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

  async updateReportAndKpiSettings(
    userId: string,
    data: {
      filterExcludeAnsweringMachine?: boolean;
      filterMinDuration?: number;
      filterMinReplicas?: number;
      telegramDailyReport?: boolean;
      telegramManagerReport?: boolean;
      telegramWeeklyReport?: boolean;
      telegramMonthlyReport?: boolean;
      telegramSkipWeekends?: boolean;
      maxDailyReport?: boolean;
      maxManagerReport?: boolean;
      emailDailyReport?: boolean;
      emailWeeklyReport?: boolean;
      emailMonthlyReport?: boolean;
      reportIncludeCallSummaries?: boolean;
      reportDetailed?: boolean;
      reportIncludeAvgValue?: boolean;
      reportIncludeAvgRating?: boolean;
      reportManagedUserIds?: string | null;
      kpiBaseSalary?: number;
      kpiTargetBonus?: number;
      kpiTargetTalkTimeMinutes?: number;
    },
  ): Promise<boolean> {
    const updateData: Record<string, unknown> = {};
    
    if (data.filterExcludeAnsweringMachine !== undefined) {
      updateData.filterExcludeAnsweringMachine = data.filterExcludeAnsweringMachine;
    }
    if (data.filterMinDuration !== undefined) {
      updateData.filterMinDuration = data.filterMinDuration;
    }
    if (data.filterMinReplicas !== undefined) {
      updateData.filterMinReplicas = data.filterMinReplicas;
    }
    if (data.telegramDailyReport !== undefined) {
      updateData.telegramDailyReport = data.telegramDailyReport;
    }
    if (data.telegramManagerReport !== undefined) {
      updateData.telegramManagerReport = data.telegramManagerReport;
    }
    if (data.telegramWeeklyReport !== undefined) {
      updateData.telegramWeeklyReport = data.telegramWeeklyReport;
    }
    if (data.telegramMonthlyReport !== undefined) {
      updateData.telegramMonthlyReport = data.telegramMonthlyReport;
    }
    if (data.telegramSkipWeekends !== undefined) {
      updateData.telegramSkipWeekends = data.telegramSkipWeekends;
    }
    if (data.maxDailyReport !== undefined) {
      updateData.maxDailyReport = data.maxDailyReport;
    }
    if (data.maxManagerReport !== undefined) {
      updateData.maxManagerReport = data.maxManagerReport;
    }
    if (data.emailDailyReport !== undefined) {
      updateData.emailDailyReport = data.emailDailyReport;
    }
    if (data.emailWeeklyReport !== undefined) {
      updateData.emailWeeklyReport = data.emailWeeklyReport;
    }
    if (data.emailMonthlyReport !== undefined) {
      updateData.emailMonthlyReport = data.emailMonthlyReport;
    }
    if (data.reportIncludeCallSummaries !== undefined) {
      updateData.reportIncludeCallSummaries = data.reportIncludeCallSummaries;
    }
    if (data.reportDetailed !== undefined) {
      updateData.reportDetailed = data.reportDetailed;
    }
    if (data.reportIncludeAvgValue !== undefined) {
      updateData.reportIncludeAvgValue = data.reportIncludeAvgValue;
    }
    if (data.reportIncludeAvgRating !== undefined) {
      updateData.reportIncludeAvgRating = data.reportIncludeAvgRating;
    }
    if (data.reportManagedUserIds !== undefined) {
      updateData.reportManagedUserIds = data.reportManagedUserIds;
    }
    if (data.kpiBaseSalary !== undefined) {
      updateData.kpiBaseSalary = data.kpiBaseSalary;
    }
    if (data.kpiTargetBonus !== undefined) {
      updateData.kpiTargetBonus = data.kpiTargetBonus;
    }
    if (data.kpiTargetTalkTimeMinutes !== undefined) {
      updateData.kpiTargetTalkTimeMinutes = data.kpiTargetTalkTimeMinutes;
    }

    if (Object.keys(updateData).length === 0) {
      return true; // Ничего не обновляем
    }

    const result = await db
      .update(schema.user)
      .set(updateData)
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async updateFilters(
    userId: string,
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        filterExcludeAnsweringMachine,
        filterMinDuration,
        filterMinReplicas,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async updateTelegramSettings(
    userId: string,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        telegramDailyReport,
        telegramManagerReport,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const { hashSync } = await import("bcryptjs");
    const passwordHash = hashSync(newPassword, 10);
    
    const result = await db
      .update(schema.user)
      .set({
        passwordHash,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async saveTelegramConnectToken(userId: string, token: string): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        telegramConnectToken: token,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async findByTelegramConnectToken(token: string): Promise<schema.User | null> {
    const result = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.telegramConnectToken, token))
      .limit(1);
    return result[0] ?? null;
  },

  async saveMaxConnectToken(userId: string, token: string): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        maxConnectToken: token,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async disconnectMax(userId: string): Promise<boolean> {
    const result = await db
      .update(schema.user)
      .set({
        maxChatId: null,
      })
      .where(eq(schema.user.id, userId));

    return (result.rowCount ?? 0) > 0;
  },
};

export type UsersRepository = typeof usersRepository;
