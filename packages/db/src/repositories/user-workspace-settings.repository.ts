/**
 * User workspace settings repository - consolidated settings per user per workspace
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type {
  EvaluationSettings,
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
      evaluationSettings?: Partial<EvaluationSettings> | null;
    },
  ): Promise<boolean> {
    const existing = await this.findByUserAndWorkspace(userId, workspaceId);

    const merge = <T>(base: T, partial?: Partial<T>): T =>
      partial ? { ...base, ...partial } : base;

    const deepMerge = <T extends Record<string, unknown>>(base: T, partial?: Partial<T>): T => {
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
      const evaluationSettings =
        data.evaluationSettings !== undefined
          ? data.evaluationSettings === null
            ? null
            : merge(
                (existing.evaluationSettings as EvaluationSettings) ?? {
                  templateSlug: "general",
                },
                data.evaluationSettings,
              )
          : (existing.evaluationSettings as EvaluationSettings | null);

      const result = await db
        .update(schema.userWorkspaceSettings)
        .set({
          filterSettings,
          reportSettings,
          kpiSettings,
          notificationSettings,
          evaluationSettings,
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
      managedUserIds: [],
    };
    const defaultKpi: KpiSettings = {
      baseSalary: 0,
      targetBonus: 0,
      targetTalkTimeMinutes: 0,
    };
    const defaultNotification: NotificationSettings = {
      email: { dailyReport: false, managerReport: false, weeklyReport: false, monthlyReport: false },
      telegram: {
        dailyReport: false,
        managerReport: false,
        weeklyReport: false,
        monthlyReport: false,
        skipWeekends: false,
      },
      max: { dailyReport: false, managerReport: false },
    };

    const evaluationSettings =
      data.evaluationSettings !== undefined && data.evaluationSettings !== null
        ? merge({ templateSlug: "general" as const }, data.evaluationSettings)
        : null;

    await db.insert(schema.userWorkspaceSettings).values({
      userId,
      workspaceId,
      filterSettings: merge(defaultFilter, data.filterSettings),
      reportSettings: merge(defaultReport, data.reportSettings),
      kpiSettings: merge(defaultKpi, data.kpiSettings),
      notificationSettings: data.notificationSettings
        ? deepMerge(defaultNotification, data.notificationSettings)
        : defaultNotification,
      evaluationSettings,
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

  async findByTelegramConnectToken(token: string): Promise<schema.UserWorkspaceSettings | null> {
    const result = await db
      .select()
      .from(schema.userWorkspaceSettings)
      .where(
        sql`${schema.userWorkspaceSettings.notificationSettings}->'telegram'->>'connectToken' = ${token}`,
      )
      .limit(1);
    return result[0] ?? null;
  },

  async saveMaxConnectToken(userId: string, workspaceId: string, token: string): Promise<boolean> {
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

  async disconnectTelegram(userId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(schema.userWorkspaceSettings)
        .where(eq(schema.userWorkspaceSettings.userId, userId));

      for (const row of rows) {
        const ns = row.notificationSettings as NotificationSettings;
        if (ns?.telegram?.connectToken) {
          await tx
            .update(schema.userWorkspaceSettings)
            .set({
              notificationSettings: {
                ...ns,
                telegram: {
                  ...ns.telegram,
                  connectToken: undefined,
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
    });
  },

  async updateEvaluationTemplateForWorkspace(
    workspaceId: string,
    fromTemplateSlug: string,
    toTemplateSlug: string,
  ): Promise<number> {
    // Find all users in the workspace who use the specified template
    const rows = await db
      .select()
      .from(schema.userWorkspaceSettings)
      .where(
        and(
          eq(schema.userWorkspaceSettings.workspaceId, workspaceId),
          sql`${schema.userWorkspaceSettings.evaluationSettings}->>'templateSlug' = ${fromTemplateSlug}`,
        ),
      );

    let updatedCount = 0;
    for (const row of rows) {
      const evaluationSettings = row.evaluationSettings as EvaluationSettings | null;
      if (evaluationSettings?.templateSlug === fromTemplateSlug) {
        const updatedEvaluationSettings: EvaluationSettings = {
          ...evaluationSettings,
          templateSlug: toTemplateSlug,
        };

        const result = await db
          .update(schema.userWorkspaceSettings)
          .set({
            evaluationSettings: updatedEvaluationSettings,
          } as typeof schema.userWorkspaceSettings.$inferInsert)
          .where(
            and(
              eq(schema.userWorkspaceSettings.userId, row.userId),
              eq(schema.userWorkspaceSettings.workspaceId, workspaceId),
            ),
          );

        if ((result.rowCount ?? 0) > 0) {
          updatedCount++;
        }
      }
    }

    return updatedCount;
  },
};

export type UserWorkspaceSettingsRepository = typeof userWorkspaceSettingsRepository;
