/**
 * Activity log - event journal
 */

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "../workspace/workspaces";

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull(),
    level: text("level").notNull(),
    message: text("message").notNull(),
    actor: text("actor").notNull(),
  },
  (table) => [
    index("activity_log_timestamp_idx").on(table.timestamp),
    index("activity_log_workspace_id_idx").on(table.workspaceId),
    index("activity_log_workspace_timestamp_idx").on(
      table.workspaceId,
      table.timestamp,
    ),
    index("activity_log_level_idx").on(table.level),
  ],
);

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
