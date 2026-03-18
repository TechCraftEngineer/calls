import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { invitations } from "./invitations";
import { workspaces } from "./workspaces";

export const workspacePbxEmployees = pgTable(
  "workspace_pbx_employees",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    extension: text("extension"),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    displayName: text("display_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>().notNull(),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("workspace_pbx_employees_workspace_provider_external_unique").on(
      table.workspaceId,
      table.provider,
      table.externalId,
    ),
    index("workspace_pbx_employees_workspace_idx").on(table.workspaceId),
    index("workspace_pbx_employees_provider_idx").on(table.provider),
    index("workspace_pbx_employees_extension_idx").on(table.extension),
    index("workspace_pbx_employees_email_idx").on(table.email),
  ],
);

export const workspacePbxNumbers = pgTable(
  "workspace_pbx_numbers",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    employeeExternalId: text("employee_external_id"),
    phoneNumber: text("phone_number").notNull(),
    extension: text("extension"),
    label: text("label"),
    lineType: text("line_type"),
    isActive: boolean("is_active").notNull().default(true),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>().notNull(),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("workspace_pbx_numbers_workspace_provider_external_unique").on(
      table.workspaceId,
      table.provider,
      table.externalId,
    ),
    index("workspace_pbx_numbers_workspace_idx").on(table.workspaceId),
    index("workspace_pbx_numbers_provider_idx").on(table.provider),
    index("workspace_pbx_numbers_phone_idx").on(table.phoneNumber),
    index("workspace_pbx_numbers_extension_idx").on(table.extension),
  ],
);

export const workspacePbxLinks = pgTable(
  "workspace_pbx_links",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    targetType: text("target_type").notNull(),
    targetExternalId: text("target_external_id").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    invitationId: uuid("invitation_id").references(() => invitations.id, {
      onDelete: "set null",
    }),
    linkSource: text("link_source").notNull().default("manual"),
    confidence: integer("confidence").notNull().default(100),
    linkedByUserId: text("linked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("workspace_pbx_links_workspace_provider_target_unique").on(
      table.workspaceId,
      table.provider,
      table.targetType,
      table.targetExternalId,
    ),
    index("workspace_pbx_links_workspace_idx").on(table.workspaceId),
    index("workspace_pbx_links_provider_idx").on(table.provider),
    index("workspace_pbx_links_user_idx").on(table.userId),
    index("workspace_pbx_links_invitation_idx").on(table.invitationId),
  ],
);

export const workspacePbxSyncState = pgTable(
  "workspace_pbx_sync_state",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    syncType: text("sync_type").notNull(),
    status: text("status").notNull().default("idle"),
    cursor: text("cursor"),
    lastStartedAt: timestamp("last_started_at"),
    lastCompletedAt: timestamp("last_completed_at"),
    lastSuccessfulAt: timestamp("last_successful_at"),
    lastError: text("last_error"),
    stats: jsonb("stats").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("workspace_pbx_sync_state_workspace_provider_type_unique").on(
      table.workspaceId,
      table.provider,
      table.syncType,
    ),
    index("workspace_pbx_sync_state_workspace_idx").on(table.workspaceId),
    index("workspace_pbx_sync_state_provider_idx").on(table.provider),
    index("workspace_pbx_sync_state_status_idx").on(table.status),
  ],
);

export const workspacePbxWebhookEvents = pgTable(
  "workspace_pbx_webhook_events",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    eventId: text("event_id"),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("received"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workspace_pbx_webhook_events_workspace_idx").on(table.workspaceId),
    index("workspace_pbx_webhook_events_provider_idx").on(table.provider),
    index("workspace_pbx_webhook_events_type_idx").on(table.eventType),
    index("workspace_pbx_webhook_events_status_idx").on(table.status),
    unique("workspace_pbx_webhook_events_workspace_provider_event_unique").on(
      table.workspaceId,
      table.provider,
      table.eventId,
    ),
  ],
);

export type WorkspacePbxEmployee = typeof workspacePbxEmployees.$inferSelect;
export type NewWorkspacePbxEmployee = typeof workspacePbxEmployees.$inferInsert;
export type WorkspacePbxNumber = typeof workspacePbxNumbers.$inferSelect;
export type NewWorkspacePbxNumber = typeof workspacePbxNumbers.$inferInsert;
export type WorkspacePbxLink = typeof workspacePbxLinks.$inferSelect;
export type NewWorkspacePbxLink = typeof workspacePbxLinks.$inferInsert;
export type WorkspacePbxSyncState = typeof workspacePbxSyncState.$inferSelect;
export type NewWorkspacePbxSyncState =
  typeof workspacePbxSyncState.$inferInsert;
export type WorkspacePbxWebhookEvent =
  typeof workspacePbxWebhookEvents.$inferSelect;
export type NewWorkspacePbxWebhookEvent =
  typeof workspacePbxWebhookEvents.$inferInsert;

export type WorkspaceMegaPbxEmployee = WorkspacePbxEmployee;
export type NewWorkspaceMegaPbxEmployee = NewWorkspacePbxEmployee;
export type WorkspaceMegaPbxNumber = WorkspacePbxNumber;
export type NewWorkspaceMegaPbxNumber = NewWorkspacePbxNumber;
export type WorkspaceMegaPbxLink = WorkspacePbxLink;
export type NewWorkspaceMegaPbxLink = NewWorkspacePbxLink;
export type WorkspaceMegaPbxSyncState = WorkspacePbxSyncState;
export type NewWorkspaceMegaPbxSyncState = NewWorkspacePbxSyncState;
export type WorkspaceMegaPbxWebhookEvent = WorkspacePbxWebhookEvent;
export type NewWorkspaceMegaPbxWebhookEvent = NewWorkspacePbxWebhookEvent;

export const workspaceMegaPbxEmployees = workspacePbxEmployees;
export const workspaceMegaPbxNumbers = workspacePbxNumbers;
export const workspaceMegaPbxLinks = workspacePbxLinks;
export const workspaceMegaPbxSyncState = workspacePbxSyncState;
export const workspaceMegaPbxWebhookEvents = workspacePbxWebhookEvents;
