/**
 * User report settings - report parameters and content options
 */

import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth/user";

export const userReportSettings = pgTable("user_report_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  // Параметры отчетов
  includeCallSummaries: boolean("include_call_summaries")
    .default(false)
    .notNull(),
  detailed: boolean("detailed").default(false).notNull(),
  includeAvgValue: boolean("include_avg_value").default(false).notNull(),
  includeAvgRating: boolean("include_avg_rating").default(false).notNull(),
  managedUserIds: text("managed_user_ids"), // JSON array of user IDs

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type UserReportSettings = typeof userReportSettings.$inferSelect;
export type NewUserReportSettings = typeof userReportSettings.$inferInsert;
