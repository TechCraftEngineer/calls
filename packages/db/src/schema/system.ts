/**
 * System domain schema - PostgreSQL tables for system configuration and logging
 */

import { index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Prompts table - промпты для AI
export const prompts = pgTable(
  "prompts",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    updated_at: text("updated_at"), // ISO string
  },
  (table) => ({
    keyIdx: index("prompts_key_idx").on(table.key),
    workspaceIdIdx: index("prompts_workspace_id_idx").on(table.workspaceId),
  }),
);

// Activity log table - журнал событий
export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    timestamp: text("timestamp").notNull(), // ISO string
    level: text("level").notNull(), // 'info', 'warning', 'error'
    message: text("message").notNull(),
    actor: text("actor").notNull(),
  },
  (table) => ({
    timestampIdx: index("activity_log_timestamp_idx").on(table.timestamp),
    workspaceIdIdx: index("activity_log_workspace_id_idx").on(
      table.workspaceId,
    ),
  }),
);
