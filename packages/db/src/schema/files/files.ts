/**
 * Files - file metadata and storage references
 */

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "../workspace/workspaces";

// File types enum
export const FILE_TYPES = {
  CALL_RECORDING: "call_recording",
  TRANSCRIPT: "transcript",
  AVATAR: "avatar",
  DOCUMENT: "document",
  ATTACHMENT: "attachment",
} as const;

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    fileType: text("file_type").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("files_workspace_id_idx").on(table.workspaceId),
    index("files_file_type_idx").on(table.fileType),
    index("files_storage_key_idx").on(table.storageKey),
    index("files_workspace_file_type_idx").on(
      table.workspaceId,
      table.fileType,
    ),
    index("files_created_at_idx").on(table.createdAt),
  ],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
