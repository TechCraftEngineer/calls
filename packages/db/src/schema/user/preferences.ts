/**
 * User preferences - per-user settings (e.g. active workspace)
 */

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { workspaces } from "../workspace/workspaces";

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  activeWorkspaceId: text("active_workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
