/**
 * Calls - call records
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { files } from "../files/files";
import { workspaces } from "../workspace/workspaces";

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename"),
    number: text("number"),
    timestamp: timestamp("timestamp").notNull(),
    name: text("name"),
    duration: integer("duration"),
    direction: text("direction"),
    status: text("status"),
    sizeBytes: integer("size_bytes"),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    internalNumber: text("internal_number"),
    source: text("source"),
    customerName: text("customer_name"),

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
    index("calls_name_internal_number_idx").on(
      table.workspaceId,
      table.name,
      table.internalNumber,
    ),
  ],
);
