/**
 * Calls domain schema - PostgreSQL tables for calls and related data
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { files } from "./files";
import { workspaces } from "./workspaces";

// Calls table - основные данные о звонках
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename"),
    number: text("number"),
    timestamp: timestamp("timestamp").notNull(), // ISO timestamp
    name: text("name"),
    duration: integer("duration").$check(sql`duration >= 0`), // в секундах
    direction: text("direction"), // 'incoming'/'outgoing'/'входящий'/'исходящий'
    status: text("status"),
    sizeBytes: integer("size_bytes").$check(sql`size_bytes >= 0`),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    internalNumber: text("internal_number"),
    source: text("source"), // менеджер/оператор
    customerName: text("customer_name"),

    // Archiving support
    isArchived: boolean("is_archived").default(false).notNull(),
    archivedAt: timestamp("archived_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("calls_workspace_filename_unique").on(
      table.workspaceId,
      table.filename,
    ),
    index("calls_timestamp_idx").on(table.timestamp),
    index("calls_internal_number_idx").on(table.internalNumber),
    index("calls_workspace_id_idx").on(table.workspaceId),
    index("calls_workspace_timestamp_idx").on(
      table.workspaceId,
      table.timestamp,
    ),
    index("calls_workspace_archived_idx").on(
      table.workspaceId,
      table.isArchived,
    ),
    index("calls_number_idx").on(table.number),
    index("calls_status_idx").on(table.status),
  ],
);

// Transcripts table - транскрипты звонков
export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    callId: uuid("call_id")
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
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("transcripts_call_id_idx").on(table.callId),
    index("transcripts_call_type_idx").on(table.callType),
    index("transcripts_sentiment_idx").on(table.sentiment),
  ],
);

// Call evaluations table - оценки качества звонков
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
    valueScore: integer("value_score").$check(
      sql`value_score >= 1 AND value_score <= 5`,
    ), // 1-5
    valueExplanation: text("value_explanation"),
    managerScore: integer("manager_score").$check(
      sql`manager_score >= 1 AND manager_score <= 5`,
    ), // 1-5
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
