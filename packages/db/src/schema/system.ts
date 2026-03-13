/**
 * System domain schema - PostgreSQL tables for system configuration and logging
 */

import { index, pgTable, serial, text } from "drizzle-orm/pg-core";

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
