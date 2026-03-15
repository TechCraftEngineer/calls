/**
 * Workspace invitations - member invitations
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
import { user } from "../auth/user";
import type {
  EvaluationSettings,
  FilterSettings,
  KpiSettings,
  NotificationSettings,
  ReportSettings,
} from "../user/workspace-settings";
import { workspaceMemberRole, workspaces } from "./workspaces";

export interface PendingUserSettings {
  notificationSettings?: NotificationSettings;
  reportSettings?: ReportSettings;
  kpiSettings?: KpiSettings;
  filterSettings?: FilterSettings;
  evaluationSettings?: EvaluationSettings | null;
}

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    email: text("email").notNull(),
    role: workspaceMemberRole("role").notNull().default("member"),
    token: text("token").notNull().unique(),

    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    pendingSettings: jsonb("pending_settings").$type<PendingUserSettings>(),

    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    acceptedBy: text("accepted_by").references(() => user.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("invitations_workspace_idx").on(table.workspaceId),
    index("invitations_email_idx").on(table.email),
    index("invitations_token_idx").on(table.token),
    index("invitations_expires_at_idx").on(table.expiresAt),
    index("invitations_workspace_email_idx").on(table.workspaceId, table.email),
  ],
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
