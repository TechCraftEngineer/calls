/**
 * Files domain schema - PostgreSQL table for storing file metadata and S3 references
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  sql,
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
    sizeBytes: integer("size_bytes").notNull(),
    fileType: text("file_type").notNull(), // из FILE_TYPES
    s3Key: text("s3_key").notNull().unique(), // ключ в S3
    s3Bucket: text("s3_bucket").notNull(), // имя S3 бакета
    s3Url: text("s3_url"), // полный URL к файлу (опционально)
    isPublic: boolean("is_public").default(false), // доступен ли файл публично
    metadata: text("metadata"), // JSON с дополнительными метаданными
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("files_workspace_id_idx").on(table.workspaceId),
    fileTypeIdx: index("files_file_type_idx").on(table.fileType),
    s3KeyIdx: index("files_s3_key_idx").on(table.s3Key),
    workspaceFileTypeIdx: index("files_workspace_file_type_idx").on(
      table.workspaceId,
      table.fileType,
    ),
    createdAtIdx: index("files_created_at_idx").on(table.createdAt),
  }),
);
