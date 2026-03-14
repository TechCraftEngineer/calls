/**
 * User filter settings - call filtering preferences
 */

import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth/user";

export const userFilterSettings = pgTable("user_filter_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  // Фильтры звонков
  excludeAnsweringMachine: boolean("exclude_answering_machine")
    .default(false)
    .notNull(),
  minDuration: integer("min_duration").default(0).notNull(),
  minReplicas: integer("min_replicas").default(0).notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type UserFilterSettings = typeof userFilterSettings.$inferSelect;
export type NewUserFilterSettings = typeof userFilterSettings.$inferInsert;
