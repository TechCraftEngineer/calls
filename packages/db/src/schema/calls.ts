/**
 * Calls domain schema - PostgreSQL tables for calls and related data
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  sql,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Calls table - основные данные о звонках
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename").unique(),
    number: text("number"),
    timestamp: timestamp("timestamp").notNull(), // ISO timestamp
    name: text("name"),
    duration: integer("duration"), // в секундах
    direction: text("direction"), // 'incoming'/'outgoing'/'входящий'/'исходящий'
    status: text("status"),
    sizeBytes: integer("size_bytes"),
    internalNumber: text("internal_number"),
    source: text("source"), // менеджер/оператор
    customerName: text("customer_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index("calls_timestamp_idx").on(table.timestamp),
    internalNumberIdx: index("calls_internal_number_idx").on(
      table.internalNumber,
    ),
    workspaceIdIdx: index("calls_workspace_id_idx").on(table.workspaceId),
    workspaceTimestampIdx: index("calls_workspace_timestamp_idx").on(
      table.workspaceId,
      table.timestamp,
    ),
    numberIdx: index("calls_number_idx").on(table.number),
    statusIdx: index("calls_status_idx").on(table.status),
  }),
);

// Transcripts table - транскрипты звонков
export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    callId: text("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    text: text("text"),
    rawText: text("raw_text"),
    title: text("title"),
    sentiment: text("sentiment"),
    confidence: real("confidence"),
    summary: text("summary"),
    sizeKb: integer("size_kb"),
    callerName: text("caller_name"),
    callType: text("call_type"),
    callTopic: text("call_topic"),
  },
  (table) => ({
    callIdIdx: index("transcripts_call_id_idx").on(table.callId),
    callTypeIdx: index("transcripts_call_type_idx").on(table.callType),
    sentimentIdx: index("transcripts_sentiment_idx").on(table.sentiment),
  }),
);

// Call evaluations table - оценки качества звонков
export const callEvaluations = pgTable(
  "call_evaluations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    callId: text("call_id")
      .notNull()
      .unique()
      .references(() => calls.id, { onDelete: "cascade" }),
    isQualityAnalyzable: boolean("is_quality_analyzable").default(true),
    notAnalyzableReason: text("not_analyzable_reason"),
    valueScore: integer("value_score"), // 1-5
    valueExplanation: text("value_explanation"),
    managerScore: integer("manager_score"), // 1-5
    managerFeedback: text("manager_feedback"),
    managerBreakdown: text("manager_breakdown"), // JSON
    managerRecommendations: text("manager_recommendations"), // JSON array
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    callIdIdx: index("call_evaluations_call_id_idx").on(table.callId),
    valueScoreIdx: index("call_evaluations_value_score_idx").on(
      table.valueScore,
    ),
    managerScoreIdx: index("call_evaluations_manager_score_idx").on(
      table.managerScore,
    ),
  }),
);
