/**
 * Users domain schema - PostgreSQL tables for users and authentication
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
} from "drizzle-orm/pg-core";

// Users table - пользователи системы
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    name: text("name").notNull(),
    givenName: text("given_name"),
    familyName: text("family_name"),
    internalExtensions: text("internal_extensions"),
    mobilePhones: text("mobile_phones"),
    created_at: text("created_at").notNull(), // ISO string
    is_active: boolean("is_active").default(true),

    // Telegram integration
    telegramChatId: text("telegram_chat_id"),
    telegram_connect_token: text("telegram_connect_token"),
    telegram_daily_report: boolean("telegram_daily_report").default(false),
    telegram_manager_report: boolean("telegram_manager_report").default(false),
    telegram_weekly_report: boolean("telegram_weekly_report").default(false),
    telegram_monthly_report: boolean("telegram_monthly_report").default(false),
    telegram_skip_weekends: boolean("telegram_skip_weekends").default(false),

    // MAX Messenger integration
    max_chat_id: text("max_chat_id"),
    max_connect_token: text("max_connect_token"),
    max_daily_report: boolean("max_daily_report").default(false),
    max_manager_report: boolean("max_manager_report").default(false),

    // Email integration
    email: text("email"),
    email_daily_report: boolean("email_daily_report").default(false),
    email_weekly_report: boolean("email_weekly_report").default(false),
    email_monthly_report: boolean("email_monthly_report").default(false),

    // Filters
    filter_exclude_answering_machine: boolean(
      "filter_exclude_answering_machine",
    ).default(false),
    filter_min_duration: integer("filter_min_duration").default(0),
    filter_min_replicas: integer("filter_min_replicas").default(0),

    // Reports settings
    report_include_call_summaries: boolean(
      "report_include_call_summaries",
    ).default(false),
    report_detailed: boolean("report_detailed").default(false),
    report_include_avg_value: boolean("report_include_avg_value").default(
      false,
    ),
    report_include_avg_rating: boolean("report_include_avg_rating").default(
      false,
    ),
    report_managed_user_ids: text("report_managed_user_ids"), // JSON array

    // KPI settings
    kpi_base_salary: real("kpi_base_salary").default(0),
    kpi_target_bonus: real("kpi_target_bonus").default(0),
    kpi_target_talk_time_minutes: integer(
      "kpi_target_talk_time_minutes",
    ).default(0),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    isActiveIdx: index("users_is_active_idx").on(table.is_active),
  }),
);
