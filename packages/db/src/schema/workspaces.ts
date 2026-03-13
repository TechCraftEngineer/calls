/**
 * Workspace domain schema - multi-tenant SaaS
 */

import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth/user";

export const workspaceMemberRole = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "member",
]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    metadata: text("metadata"), // JSON string for flexible data
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    slugIdx: index("workspaces_slug_idx").on(table.slug),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspace_id: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceMemberRole("role").notNull().default("member"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_members_workspace_id_idx").on(
      table.workspace_id,
    ),
    userIdIdx: index("workspace_members_user_id_idx").on(table.user_id),
    workspaceUserUnique: unique("workspace_members_workspace_user_unique").on(
      table.workspace_id,
      table.user_id,
    ),
    workspaceUserIdx: index("workspace_members_workspace_user_idx").on(
      table.workspace_id,
      table.user_id
    ),
  }),
);
