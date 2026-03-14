/**
 * Audit log schema - comprehensive audit trail for compliance
 */

import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth/user";
import { workspaces } from "./workspaces";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    // Action details
    action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'READ'
    resource: text("resource").notNull(), // 'call', 'user', 'workspace', etc.
    resourceId: text("resource_id"),

    // Changes
    oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),

    // Request context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),

    // Additional metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_workspace_idx").on(table.workspaceId),
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_resource_idx").on(table.resource, table.resourceId),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
