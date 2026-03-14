/**
 * Files domain schema - PostgreSQL table for storing file metadata and S3 references
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
import { workspaces } from "./workspaces";

// File types enum
export const FILE_TYPES = {
  CALL_RECORDING: "call_recording",
  TRANSCRIPT: "transcript",
  AVATAR: "avatar",
  DOCUMENT: "document",
  ATTACHMENT: "attachment",
} as const;

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];

// Files table - универсальная таблица для хранения метаданных файлов
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename").notNull(), // оригинальное имя файла
    originalName: text("original_name").notNull(), // оригинальное имя файла
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().$check(sql`size_bytes >= 0`),
    fileType: text("file_type").notNull(), // из FILE_TYPES
    storageKey: text("storage_key").notNull().unique(), // ключ в object storage
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
