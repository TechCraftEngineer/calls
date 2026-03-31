/**
 * Workspace members - user membership and roles
 *
 * Invitation fields:
 * - status: 'active' (accepted) | 'pending' (invited but not accepted)
 * - invitationToken: unique token for accepting invitation
 * - invitationExpiresAt: expiration date for invitation
 * - invitedBy: user who sent the invitation
 */

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { workspaceMemberRole, workspaces } from "./workspaces";

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceMemberRole("role").notNull().default("member"),

    // Invitation fields
    status: text("status").notNull().default("active"),
    invitationToken: text("invitation_token"),
    invitationExpiresAt: timestamp("invitation_expires_at"),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workspace_members_workspace_id_idx").on(table.workspaceId),
    index("workspace_members_user_id_idx").on(table.userId),
    unique("workspace_members_workspace_user_unique").on(table.workspaceId, table.userId),
    index("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
    index("workspace_members_status_idx").on(table.status),
    index("workspace_members_invitation_token_idx").on(table.invitationToken),
  ],
);
