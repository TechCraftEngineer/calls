/**
 * User KPI settings - salary, bonus, targets
 */

import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth/user";

export const userKpiSettings = pgTable("user_kpi_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  // KPI параметры
  baseSalary: integer("base_salary").default(0).notNull(),
  targetBonus: integer("target_bonus").default(0).notNull(),
  targetTalkTimeMinutes: integer("target_talk_time_minutes")
    .default(0)
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type UserKpiSettings = typeof userKpiSettings.$inferSelect;
export type NewUserKpiSettings = typeof userKpiSettings.$inferInsert;
