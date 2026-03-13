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
  timestamp,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Calls table - основные данные о звонках
export const calls = pgTable(
  "calls",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename").unique(),
    number: text("number"),
    timestamp: timestamp("timestamp").notNull(), // ISO timestamp
    name: text("name"),
    duration: integer("duration"), // в секундах
    direction: text("direction"), // 'incoming'/'outgoing'/'входящий'/'исходящий'
    status: text("status"),
    sizeBytes: integer("sizeBytes"),
    internalNumber: text("internalNumber"),
    source: text("source"), // менеджер/оператор
    customerName: text("customerName"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
  }),
);

// Transcripts table - транскрипты звонков
export const transcripts = pgTable(
  "transcripts",
  {
    id: serial("id").primaryKey(),
    callId: integer("callId")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    text: text("text"),
    rawText: text("rawText"),
    title: text("title"),
    sentiment: text("sentiment"),
    confidence: real("confidence"),
    summary: text("summary"),
    sizeKb: integer("sizeKb"),
    callerName: text("callerName"),
    callType: text("callType"),
    callTopic: text("callTopic"),
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
    id: serial("id").primaryKey(),
    callId: integer("callId")
      .notNull()
      .unique()
      .references(() => calls.id, { onDelete: "cascade" }),
    isQualityAnalyzable: boolean("isQualityAnalyzable").default(true),
    notAnalyzableReason: text("notAnalyzableReason"),
    valueScore: integer("valueScore"), // 1-5
    valueExplanation: text("valueExplanation"),
    managerScore: integer("managerScore"), // 1-5
    managerFeedback: text("managerFeedback"),
    managerBreakdown: text("managerBreakdown"), // JSON
    managerRecommendations: text("managerRecommendations"), // JSON array
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
