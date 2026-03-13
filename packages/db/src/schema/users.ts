/**
 * Users domain schema - PostgreSQL tables for users and authentication
 */

import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Users table - основная информация о пользователях
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    name: text("name").notNull(),
    given_name: text("given_name"),
    family_name: text("family_name"),
    internal_extensions: text("internal_extensions"),
    mobile_phones: text("mobile_phones"),
    email: text("email"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    is_active: boolean("is_active").default(true),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    isActiveIdx: index("users_is_active_idx").on(table.is_active),
  }),
);

// User integrations - настройки интеграций с мессенджерами
export const userIntegrations = pgTable(
  "user_integrations",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    // Telegram integration
    telegram_chat_id: text("telegram_chat_id"),
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
    email_daily_report: boolean("email_daily_report").default(false),
    email_weekly_report: boolean("email_weekly_report").default(false),
    email_monthly_report: boolean("email_monthly_report").default(false),

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_integrations_user_id_idx").on(table.user_id),
    userIdUnique: unique("user_integrations_user_id_unique").on(table.user_id),
  }),
);

// User filters - настройки фильтров звонков
export const userFilters = pgTable(
  "user_filters",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    filter_exclude_answering_machine: boolean(
      "filter_exclude_answering_machine",
    ).default(false),
    filter_min_duration: integer("filter_min_duration").default(0),
    filter_min_replicas: integer("filter_min_replicas").default(0),

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_filters_user_id_idx").on(table.user_id),
    userIdUnique: unique("user_filters_user_id_unique").on(table.user_id),
  }),
);

// User report settings - настройки отчетов
export const userReportSettings = pgTable(
  "user_report_settings",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

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
    report_managed_user_ids: json("report_managed_user_ids"), // JSON array

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_report_settings_user_id_idx").on(table.user_id),
    userIdUnique: unique("user_report_settings_user_id_unique").on(
      table.user_id,
    ),
  }),
);

// User KPI settings - настройки KPI
export const userKpiSettings = pgTable(
  "user_kpi_settings",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    kpi_base_salary: real("kpi_base_salary").default(0),
    kpi_target_bonus: real("kpi_target_bonus").default(0),
    kpi_target_talk_time_minutes: integer(
      "kpi_target_talk_time_minutes",
    ).default(0),

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_kpi_settings_user_id_idx").on(table.user_id),
    userIdUnique: unique("user_kpi_settings_user_id_unique").on(table.user_id),
  }),
);
