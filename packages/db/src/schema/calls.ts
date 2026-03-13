/**
 * Calls domain schema - PostgreSQL tables for calls and related data
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Calls table - основные данные о звонках
export const calls = pgTable(
  "calls",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
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
    workspaceIdIdx: index("calls_workspace_id_idx").on(table.workspaceId),
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
