/**
 * Feature flags schema - A/B testing and gradual rollouts
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),

    enabled: boolean("enabled").default(false).notNull(),

    // Targeting
    workspaceIds: jsonb("workspace_ids").$type<string[]>(), // null = all workspaces
    userIds: jsonb("user_ids").$type<string[]>(), // specific users
    rolloutPercentage: integer("rollout_percentage").default(0).notNull(),

    // Conditions
    conditions: jsonb("conditions").$type<{
      plans?: string[]; // ['pro', 'enterprise']
      minVersion?: string;
      maxVersion?: string;
      countries?: string[];
    }>(),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flags_key_idx").on(table.key),
    index("feature_flags_enabled_idx").on(table.enabled),
  ],
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
