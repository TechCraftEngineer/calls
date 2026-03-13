/**
 * System domain schema - PostgreSQL tables for system configuration and logging
 */

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Prompts table - промпты для AI
export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: index("prompts_key_idx").on(table.key),
    workspaceIdIdx: index("prompts_workspace_id_idx").on(table.workspaceId),
    workspaceKeyIdx: index("prompts_workspace_key_idx").on(
      table.workspaceId,
      table.key,
    ),
  }),
);

// Activity log table - журнал событий
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull(), // ISO timestamp
    level: text("level").notNull(), // 'info', 'warning', 'error'
    message: text("message").notNull(),
    actor: text("actor").notNull(),
  },
  (table) => ({
    timestampIdx: index("activity_log_timestamp_idx").on(table.timestamp),
    workspaceIdIdx: index("activity_log_workspace_id_idx").on(
      table.workspaceId,
    ),
    workspaceTimestampIdx: index("activity_log_workspace_timestamp_idx").on(
      table.workspaceId,
      table.timestamp,
    ),
    levelIdx: index("activity_log_level_idx").on(table.level),
  }),
);
