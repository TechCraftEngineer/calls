/**
 * User workspace settings repository - consolidated settings per user per workspace
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type {
  FilterSettings,
  KpiSettings,
  NotificationSettings,
  ReportSettings,
} from "../schema/user/workspace-settings";

export const userWorkspaceSettingsRepository = {
  async findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<schema.UserWorkspaceSettings | null> {
    const result = await db
      .select()
      .from(schema.userWorkspaceSettings)
      .where(
        and(
          eq(schema.userWorkspaceSettings.userId, userId),
          eq(schema.userWorkspaceSettings.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async upsert(
    userId: string,
    workspaceId: string,
    data: {
      filterSettings?: Partial<FilterSettings>;
      reportSettings?: Partial<ReportSettings>;
      kpiSettings?: Partial<KpiSettings>;
      notificationSettings?: Partial<{
        email?: Partial<NotificationSettings["email"]>;
        telegram?: Partial<NotificationSettings["telegram"]>;
        max?: Partial<NotificationSettings["max"]>;
      }>;
    },
  ): Promise<boolean> {
    const existing = await this.findByUserAndWorkspace(userId, workspaceId);

    const merge = <T>(base: T, partial?: Partial<T>): T =>
      partial ? { ...base, ...partial } : base;

    const deepMerge = <T extends Record<string, unknown>>(
      base: T,
      partial?: Partial<T>,
    ): T => {
      if (!partial) return base;
      const out = { ...base };
      for (const k of Object.keys(partial) as (keyof T)[]) {
        const pv = partial[k];
        if (pv !== undefined) {
          const bv = base[k];
          if (
            typeof pv === "object" &&
            pv !== null &&
            !Array.isArray(pv) &&
            typeof bv === "object" &&
            bv !== null &&
            !Array.isArray(bv)
          ) {
            (out as Record<string, unknown>)[k as string] = deepMerge(
              bv as Record<string, unknown>,
              pv as Record<string, unknown>,
            );
          } else {
            (out as Record<string, unknown>)[k as string] = pv;
          }
        }
      }
      return out;
    };

    if (existing) {
      const filterSettings = data.filterSettings
        ? merge(existing.filterSettings as FilterSettings, data.filterSettings)
        : (existing.filterSettings as FilterSettings);
      const reportSettings = data.reportSettings
        ? merge(existing.reportSettings as ReportSettings, data.reportSettings)
        : (existing.reportSettings as ReportSettings);
      const kpiSettings = data.kpiSettings
        ? merge(existing.kpiSettings as KpiSettings, data.kpiSettings)
        : (existing.kpiSettings as KpiSettings);
      const notificationSettings = data.notificationSettings
        ? deepMerge(
            existing.notificationSettings as NotificationSettings,
            data.notificationSettings,
          )
        : (existing.notificationSettings as NotificationSettings);

      const result = await db
        .update(schema.userWorkspaceSettings)
        .set({
          filterSettings,
          reportSettings,
          kpiSettings,
          notificationSettings,
        } as typeof schema.userWorkspaceSettings.$inferInsert)
        .where(
          and(
            eq(schema.userWorkspaceSettings.userId, userId),
            eq(schema.userWorkspaceSettings.workspaceId, workspaceId),
          ),
        );
      return (result.rowCount ?? 0) > 0;
    }

    const defaultFilter: FilterSettings = {
      excludeAnsweringMachine: false,
      minDuration: 0,
      minReplicas: 0,
    };
    const defaultReport: ReportSettings = {
      includeCallSummaries: false,
      detailed: false,
      includeAvgValue: false,
      includeAvgRating: false,
      managedUserIds: [],
    };
    const defaultKpi: KpiSettings = {
      baseSalary: 0,
      targetBonus: 0,
      targetTalkTimeMinutes: 0,
    };
    const defaultNotification: NotificationSettings = {
      email: { dailyReport: false, weeklyReport: false, monthlyReport: false },
      telegram: {
        dailyReport: false,
        managerReport: false,
        weeklyReport: false,
        monthlyReport: false,
        skipWeekends: false,
      },
      max: { dailyReport: false, managerReport: false },
    };

    await db.insert(schema.userWorkspaceSettings).values({
      userId,
      workspaceId,
      filterSettings: merge(defaultFilter, data.filterSettings),
      reportSettings: merge(defaultReport, data.reportSettings),
      kpiSettings: merge(defaultKpi, data.kpiSettings),
      notificationSettings: data.notificationSettings
        ? deepMerge(defaultNotification, data.notificationSettings)
        : defaultNotification,
    } as typeof schema.userWorkspaceSettings.$inferInsert);
    return true;
  },

  async saveTelegramConnectToken(
    userId: string,
    workspaceId: string,
    token: string,
  ): Promise<boolean> {
    return this.upsert(userId, workspaceId, {
      notificationSettings: {
        telegram: {
          connectToken: token,
        } as Partial<NotificationSettings["telegram"]>,
      },
    });
  },

  async findByTelegramConnectToken(
    token: string,
  ): Promise<schema.UserWorkspaceSettings | null> {
    const result = await db
      .select()
      .from(schema.userWorkspaceSettings)
      .where(
        sql`${schema.userWorkspaceSettings.notificationSettings}->'telegram'->>'connectToken' = ${token}`,
      )
      .limit(1);
    return result[0] ?? null;
  },

  async saveMaxConnectToken(
    userId: string,
    workspaceId: string,
    token: string,
  ): Promise<boolean> {
    return this.upsert(userId, workspaceId, {
      notificationSettings: {
        max: {
          connectToken: token,
        } as Partial<NotificationSettings["max"]>,
      },
    });
  },

  async disconnectMax(userId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(schema.userWorkspaceSettings)
      .where(eq(schema.userWorkspaceSettings.userId, userId));

    for (const row of rows) {
      const ns = row.notificationSettings as NotificationSettings;
      if (ns?.max?.connectToken || ns?.max?.chatId) {
        await db
          .update(schema.userWorkspaceSettings)
          .set({
            notificationSettings: {
              ...ns,
              max: {
                ...ns.max,
                connectToken: undefined,
                chatId: undefined,
              },
            },
          })
          .where(
            and(
              eq(schema.userWorkspaceSettings.userId, userId),
              eq(schema.userWorkspaceSettings.workspaceId, row.workspaceId),
            ),
          );
      }
    }
    return true;
  },
};

export type UserWorkspaceSettingsRepository =
  typeof userWorkspaceSettingsRepository;
