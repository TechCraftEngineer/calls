/**
 * Workspace domain schema - multi-tenant SaaS
 */

import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
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
    id: text("id").primaryKey().default(sql`workspace_id_generate()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceMemberRole("role").notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
