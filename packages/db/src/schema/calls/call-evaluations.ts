/**
 * Call evaluations - quality scores and feedback
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { calls } from "./calls";

export const callEvaluations = pgTable(
  "call_evaluations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    callId: uuid("call_id")
      .notNull()
      .unique()
      .references(() => calls.id, { onDelete: "cascade" }),
    isQualityAnalyzable: boolean("is_quality_analyzable").default(true),
    notAnalyzableReason: text("not_analyzable_reason"),
    valueScore: integer("value_score"),
    valueExplanation: text("value_explanation"),
    managerScore: integer("manager_score"),
    managerFeedback: text("manager_feedback"),
    managerBreakdown:
      jsonb("manager_breakdown").$type<Record<string, unknown>>(),
    managerRecommendations: jsonb("manager_recommendations").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("call_evaluations_call_id_idx").on(table.callId),
    index("call_evaluations_value_score_idx").on(table.valueScore),
    index("call_evaluations_manager_score_idx").on(table.managerScore),
  ],
);
