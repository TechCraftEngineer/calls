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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
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
    workspaceId: integer("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceMemberRole("role").notNull().default("member"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_members_workspace_id_idx").on(
      table.workspaceId,
    ),
    userIdIdx: index("workspace_members_user_id_idx").on(table.userId),
    workspaceUserUnique: unique("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    workspaceUserIdx: index("workspace_members_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
  }),
);
