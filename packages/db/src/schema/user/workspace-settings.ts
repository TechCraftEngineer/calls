/**
 * User workspace settings - consolidated settings per user per workspace
 * Replaces: user-notification-settings, user-report-settings, user-kpi-settings, user-filter-settings
 */

import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { workspaces } from "../workspace/workspaces";

export interface NotificationSettings {
  email: {
    dailyReport: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
  };
  telegram: {
    dailyReport: boolean;
    managerReport: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
    skipWeekends: boolean;
    connectToken?: string;
  };
  max: {
    chatId?: string;
    dailyReport: boolean;
    managerReport: boolean;
    connectToken?: string;
  };
}

export interface ReportSettings {
  includeCallSummaries: boolean;
  detailed: boolean;
  includeAvgValue: boolean;
  includeAvgRating: boolean;
  managedUserIds: string[];
}

export interface KpiSettings {
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
}

export interface FilterSettings {
  excludeAnsweringMachine: boolean;
  minDuration: number;
  minReplicas: number;
}

export interface EvaluationSettings {
  templateSlug: string;
  customInstructions?: string;
}

export const userWorkspaceSettings = pgTable(
  "user_workspace_settings",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    notificationSettings: jsonb("notification_settings")
      .$type<NotificationSettings>()
      .notNull()
      .default(sql`'{
        "email": {"dailyReport": false, "weeklyReport": false, "monthlyReport": false},
        "telegram": {"dailyReport": false, "managerReport": false, "weeklyReport": false, "monthlyReport": false, "skipWeekends": false},
        "max": {"dailyReport": false, "managerReport": false}
      }'::jsonb`),

    reportSettings: jsonb("report_settings")
      .$type<ReportSettings>()
      .notNull()
      .default(sql`'{
        "includeCallSummaries": false,
        "detailed": false,
        "includeAvgValue": false,
        "includeAvgRating": false,
        "managedUserIds": []
      }'::jsonb`),

    kpiSettings: jsonb("kpi_settings")
      .$type<KpiSettings>()
      .notNull()
      .default(sql`'{
        "baseSalary": 0,
        "targetBonus": 0,
        "targetTalkTimeMinutes": 0
      }'::jsonb`),

    filterSettings: jsonb("filter_settings")
      .$type<FilterSettings>()
      .notNull()
      .default(sql`'{
        "excludeAnsweringMachine": false,
        "minDuration": 0,
        "minReplicas": 0
      }'::jsonb`),

    evaluationSettings: jsonb("evaluation_settings")
      .$type<EvaluationSettings | null>()
      .default(null),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("user_workspace_settings_user_workspace_unique").on(
      table.userId,
      table.workspaceId,
    ),
    index("user_workspace_settings_workspace_idx").on(table.workspaceId),
    index("user_workspace_settings_user_idx").on(table.userId),
    index("user_workspace_settings_notification_gin_idx").using(
      "gin",
      table.notificationSettings,
    ),
    index("user_workspace_settings_report_gin_idx").using(
      "gin",
      table.reportSettings,
    ),
  ],
);

export type UserWorkspaceSettings = typeof userWorkspaceSettings.$inferSelect;
export type NewUserWorkspaceSettings =
  typeof userWorkspaceSettings.$inferInsert;
