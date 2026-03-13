/**
 * Backend schema - PostgreSQL schema for calls application
 * Migrated from SQLite schema in apps/backend/app/services/storage.py
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Calls table - основные данные о звонках
export const calls = pgTable(
  "calls",
  {
    id: serial("id").primaryKey(),
    filename: text("filename").unique(),
    number: text("number"),
    timestamp: text("timestamp").notNull(), // ISO string
    name: text("name"),
    duration: integer("duration"), // в секундах
    direction: text("direction"), // 'incoming'/'outgoing'/'входящий'/'исходящий'
    status: text("status"),
    size_bytes: integer("size_bytes"),
    internal_number: text("internal_number"),
    source: text("source"), // менеджер/оператор
    customer_name: text("customer_name"),
  },
  (table) => ({
    timestampIdx: index("calls_timestamp_idx").on(table.timestamp),
    internalNumberIdx: index("calls_internal_number_idx").on(
      table.internal_number,
    ),
  }),
);

// Transcripts table - транскрипты звонков
export const transcripts = pgTable(
  "transcripts",
  {
    id: serial("id").primaryKey(),
    call_id: integer("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    text: text("text"),
    raw_text: text("raw_text"),
    title: text("title"),
    sentiment: text("sentiment"),
    confidence: real("confidence"),
    summary: text("summary"),
    size_kb: integer("size_kb"),
    caller_name: text("caller_name"),
    call_type: text("call_type"),
    call_topic: text("call_topic"),
  },
  (table) => ({
    callIdIdx: index("transcripts_call_id_idx").on(table.call_id),
  }),
);

// Call evaluations table - оценки качества звонков
export const callEvaluations = pgTable(
  "call_evaluations",
  {
    id: serial("id").primaryKey(),
    call_id: integer("call_id")
      .notNull()
      .unique()
      .references(() => calls.id, { onDelete: "cascade" }),
    is_quality_analyzable: boolean("is_quality_analyzable").default(true),
    not_analyzable_reason: text("not_analyzable_reason"),
    value_score: integer("value_score"), // 1-5
    value_explanation: text("value_explanation"),
    manager_score: integer("manager_score"), // 1-5
    manager_feedback: text("manager_feedback"),
    manager_breakdown: text("manager_breakdown"), // JSON
    manager_recommendations: text("manager_recommendations"), // JSON array
    created_at: text("created_at").notNull(), // ISO string
  },
  (table) => ({
    callIdIdx: index("call_evaluations_call_id_idx").on(table.call_id),
    valueScoreIdx: index("call_evaluations_value_score_idx").on(
      table.value_score,
    ),
  }),
);

// Users table - пользователи системы
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    name: text("name").notNull(),
    first_name: text("first_name"),
    last_name: text("last_name"),
    internal_numbers: text("internal_numbers"), // JSON array или строка
    mobile_numbers: text("mobile_numbers"), // JSON array или строка
    created_at: text("created_at").notNull(), // ISO string
    is_active: boolean("is_active").default(true),

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

// Prompts table - промпты для AI
export const prompts = pgTable(
  "prompts",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    updated_at: text("updated_at"), // ISO string
  },
  (table) => ({
    keyIdx: index("prompts_key_idx").on(table.key),
  }),
);

// Activity log table - журнал событий
export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    timestamp: text("timestamp").notNull(), // ISO string
    level: text("level").notNull(), // 'info', 'warning', 'error'
    message: text("message").notNull(),
    actor: text("actor").notNull(),
  },
  (table) => ({
    timestampIdx: index("activity_log_timestamp_idx").on(table.timestamp),
  }),
);

// Types for TypeScript
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type CallEvaluation = typeof callEvaluations.$inferSelect;
export type NewCallEvaluation = typeof callEvaluations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
