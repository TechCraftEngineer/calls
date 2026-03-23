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
import { workspacePbxNumbers } from "../workspace/pbx";
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
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    name: text("name"),
    duration: integer("duration"),
    direction: text("direction"),
    status: text("status"),
    sizeBytes: integer("size_bytes"),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    pbxNumberId: uuid("pbx_number_id").references(
      () => workspacePbxNumbers.id,
      {
        onDelete: "set null",
      },
    ),
    internalNumber: text("internal_number"),
    provider: text("provider"),
    externalId: text("external_id"),
    source: text("source"),
    customerName: text("customer_name"),

    isArchived: boolean("is_archived").default(false).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("calls_workspace_filename_unique").on(
      table.workspaceId,
      table.filename,
    ),
    unique("calls_workspace_provider_external_id_unique").on(
      table.workspaceId,
      table.provider,
      table.externalId,
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
    index("calls_pbx_number_id_idx").on(table.pbxNumberId),
    index("calls_status_idx").on(table.status),
    index("idx_calls_workspace_id_name_internal_number").on(
      table.workspaceId,
      table.name,
      table.internalNumber,
    ),
  ],
);
