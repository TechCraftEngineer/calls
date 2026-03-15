/**
 * Prompts - AI prompts per workspace
 */

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "../workspace/workspaces";

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
  (table) => [
    index("prompts_key_idx").on(table.key),
    index("prompts_workspace_id_idx").on(table.workspaceId),
    index("prompts_workspace_key_idx").on(table.workspaceId, table.key),
  ],
);

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
