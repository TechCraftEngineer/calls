/**
 * User notification settings - email, telegram, max reports
 */

import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth/user";

export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  // Email отчеты
  emailDailyReport: boolean("email_daily_report").default(false).notNull(),
  emailWeeklyReport: boolean("email_weekly_report").default(false).notNull(),
  emailMonthlyReport: boolean("email_monthly_report").default(false).notNull(),

  // Telegram отчеты
  telegramDailyReport: boolean("telegram_daily_report")
    .default(false)
    .notNull(),
  telegramManagerReport: boolean("telegram_manager_report")
    .default(false)
    .notNull(),
  telegramWeeklyReport: boolean("telegram_weekly_report")
    .default(false)
    .notNull(),
  telegramMonthlyReport: boolean("telegram_monthly_report")
    .default(false)
    .notNull(),
  telegramSkipWeekends: boolean("telegram_skip_weekends")
    .default(false)
    .notNull(),
  telegramConnectToken: text("telegram_connect_token"),

  // MAX отчеты
  maxChatId: text("max_chat_id"),
  maxDailyReport: boolean("max_daily_report").default(false).notNull(),
  maxManagerReport: boolean("max_manager_report").default(false).notNull(),
  maxConnectToken: text("max_connect_token"),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type UserNotificationSettings =
  typeof userNotificationSettings.$inferSelect;
export type NewUserNotificationSettings =
  typeof userNotificationSettings.$inferInsert;
