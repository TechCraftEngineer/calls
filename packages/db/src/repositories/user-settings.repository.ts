/**
 * User settings repositories - handles all user settings tables
 */

import { eq } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export const userNotificationSettingsRepository = {
  async findByUserId(
    userId: string,
  ): Promise<schema.UserNotificationSettings | null> {
    const result = await db
      .select()
      .from(schema.userNotificationSettings)
      .where(eq(schema.userNotificationSettings.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsert(
    userId: string,
    data: Partial<schema.NewUserNotificationSettings>,
  ): Promise<boolean> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const result = await db
        .update(schema.userNotificationSettings)
        .set(data)
        .where(eq(schema.userNotificationSettings.userId, userId));
      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.userNotificationSettings).values({
      userId,
      ...data,
    });
    return true;
  },

  async saveTelegramConnectToken(
    userId: string,
    token: string,
  ): Promise<boolean> {
    return this.upsert(userId, { telegramConnectToken: token });
  },

  async findByTelegramConnectToken(
    token: string,
  ): Promise<schema.UserNotificationSettings | null> {
    const result = await db
      .select()
      .from(schema.userNotificationSettings)
      .where(eq(schema.userNotificationSettings.telegramConnectToken, token))
      .limit(1);
    return result[0] ?? null;
  },

  async saveMaxConnectToken(userId: string, token: string): Promise<boolean> {
    return this.upsert(userId, { maxConnectToken: token });
  },

  async disconnectMax(userId: string): Promise<boolean> {
    return this.upsert(userId, { maxChatId: null });
  },
};

export const userReportSettingsRepository = {
  async findByUserId(
    userId: string,
  ): Promise<schema.UserReportSettings | null> {
    const result = await db
      .select()
      .from(schema.userReportSettings)
      .where(eq(schema.userReportSettings.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsert(
    userId: string,
    data: Partial<schema.NewUserReportSettings>,
  ): Promise<boolean> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const result = await db
        .update(schema.userReportSettings)
        .set(data)
        .where(eq(schema.userReportSettings.userId, userId));
      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.userReportSettings).values({
      userId,
      ...data,
    });
    return true;
  },
};

export const userKpiSettingsRepository = {
  async findByUserId(userId: string): Promise<schema.UserKpiSettings | null> {
    const result = await db
      .select()
      .from(schema.userKpiSettings)
      .where(eq(schema.userKpiSettings.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsert(
    userId: string,
    data: Partial<schema.NewUserKpiSettings>,
  ): Promise<boolean> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const result = await db
        .update(schema.userKpiSettings)
        .set(data)
        .where(eq(schema.userKpiSettings.userId, userId));
      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.userKpiSettings).values({
      userId,
      ...data,
    });
    return true;
  },
};

export const userFilterSettingsRepository = {
  async findByUserId(
    userId: string,
  ): Promise<schema.UserFilterSettings | null> {
    const result = await db
      .select()
      .from(schema.userFilterSettings)
      .where(eq(schema.userFilterSettings.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsert(
    userId: string,
    data: Partial<schema.NewUserFilterSettings>,
  ): Promise<boolean> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const result = await db
        .update(schema.userFilterSettings)
        .set(data)
        .where(eq(schema.userFilterSettings.userId, userId));
      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.userFilterSettings).values({
      userId,
      ...data,
    });
    return true;
  },
};
