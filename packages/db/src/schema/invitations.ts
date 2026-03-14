/**
 * Invitations schema - workspace member invitations
 */

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth/user";
import { workspaceMemberRole, workspaces } from "./workspaces";

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
