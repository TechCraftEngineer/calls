/**
 * Transcripts - call transcripts
 */

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { calls } from "./calls";

export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    callId: uuid("call_id")
      .notNull()
      .unique()
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
