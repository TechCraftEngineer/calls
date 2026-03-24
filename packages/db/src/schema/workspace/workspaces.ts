/**
 * Workspaces - multi-tenant SaaS core
 */

import { sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  () => [],
);
