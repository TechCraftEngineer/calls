/**
 * Calls - call records
 */

import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { files } from "../files/files";
import { workspaces } from "../workspace/workspaces";
import { callDirectionEnum, callStatusEnum } from "./enums";

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename"),
    number: text("number"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    name: text("name"),
    direction: callDirectionEnum("direction"),
    status: callStatusEnum("status"),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    enhancedAudioFileId: uuid("enhanced_audio_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    internalNumber: text("internal_number"),
    provider: text("provider"),
    externalId: text("external_id"),
    source: text("source"),
    customerName: text("customer_name"),

    isArchived: boolean("is_archived").default(false).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    transcriptionStatus: text("transcription_status"),
    transcriptionError: text("transcription_error"),
    transcribedAt: timestamp("transcribed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Используем pgEnum для валидации значений
    check("calls_status_check", sql`status IN ('missed', 'answered', 'voicemail', 'failed')`),
    check("calls_direction_check", sql`direction IN ('inbound', 'outbound')`),
    unique("calls_workspace_filename_unique").on(table.workspaceId, table.filename),
    unique("calls_workspace_provider_external_id_unique").on(
      table.workspaceId,
      table.provider,
      table.externalId,
    ),
    index("calls_timestamp_idx").on(table.timestamp),
    index("calls_internal_number_idx").on(table.internalNumber),
    index("calls_workspace_id_idx").on(table.workspaceId),
    index("calls_workspace_timestamp_idx").on(table.workspaceId, table.timestamp),
    index("calls_workspace_archived_idx").on(table.workspaceId, table.isArchived),
    index("calls_number_idx").on(table.number),
    index("calls_enhanced_audio_file_id_idx").on(table.enhancedAudioFileId),
    index("calls_status_idx").on(table.status),
    index("idx_calls_workspace_id_name_internal_number").on(
      table.workspaceId,
      table.name,
      table.internalNumber,
    ),
  ],
);
