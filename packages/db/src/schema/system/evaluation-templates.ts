/**
 * Evaluation templates - custom call evaluation templates per workspace
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
import { workspaces } from "../workspace/workspaces";

export const evaluationTemplates = pgTable(
  "evaluation_templates",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("evaluation_templates_workspace_idx").on(table.workspaceId),
    unique("evaluation_templates_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
  ],
);

export type EvaluationTemplate = typeof evaluationTemplates.$inferSelect;
export type NewEvaluationTemplate = typeof evaluationTemplates.$inferInsert;
