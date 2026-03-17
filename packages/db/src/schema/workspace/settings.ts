/**
 * Настройки воркспейса — key-value хранилище настроек.
 * Заменяет таблицу prompts для настроек отчётов, моделей, оценки и т.д.
 */

import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const workspaceSettings = pgTable(
  "workspace_settings",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("workspace_settings_workspace_key_unique").on(
      table.workspaceId,
      table.key,
    ),
    index("workspace_settings_key_idx").on(table.key),
    index("workspace_settings_workspace_idx").on(table.workspaceId),
  ],
);

export type WorkspaceSetting = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSetting = typeof workspaceSettings.$inferInsert;
