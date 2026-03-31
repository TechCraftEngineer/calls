/**
 * Email reports service — получатели email-отчётов
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type { NotificationSettings, ReportSettings } from "../schema/user/workspace-settings";

export type ReportType = "daily" | "weekly" | "monthly";

export interface EmailReportRecipient {
  userId: string;
  email: string;
  reportType: ReportType;
  internalNumbers: string[] | null;
  reportSettings: {
    includeCallSummaries: boolean;
    detailed: boolean;
    includeAvgValue: boolean;
    includeAvgRating: boolean;
    kpi: boolean;
  };
}

function parseInternalExtensions(ext: string | null): string[] | null {
  if (!ext || String(ext).trim().toLowerCase() === "all") return null;
  return ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Возвращает пользователей воркспейса, которым нужно отправить email-отчёт указанного типа.
 */
export async function getEmailReportRecipients(
  workspaceId: string,
  reportType: ReportType,
): Promise<EmailReportRecipient[]> {
  const members = await db
    .select({
      userId: schema.workspaceMembers.userId,
      email: schema.user.email,
      notificationSettings: schema.userWorkspaceSettings.notificationSettings,
      reportSettings: schema.userWorkspaceSettings.reportSettings,
      internalExtensions: schema.user.internalExtensions,
    })
    .from(schema.workspaceMembers)
    .innerJoin(schema.user, eq(schema.workspaceMembers.userId, schema.user.id))
    .leftJoin(
      schema.userWorkspaceSettings,
      and(
        eq(schema.workspaceMembers.userId, schema.userWorkspaceSettings.userId),
        eq(schema.workspaceMembers.workspaceId, schema.userWorkspaceSettings.workspaceId),
      ),
    )
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.status, "active"),
        isNull(schema.user.deletedAt),
        sql`${schema.user.email} IS NOT NULL AND trim(${schema.user.email}) != ''`,
      ),
    );

  const recipients: EmailReportRecipient[] = [];

  for (const m of members) {
    const email = m.email?.trim();
    if (!email) continue;

    const ns = (m.notificationSettings ?? {}) as NotificationSettings;
    const rs = (m.reportSettings ?? {}) as ReportSettings;
    const em = ns?.email ?? {};

    const dailyEnabled = em.dailyReport ?? false;
    const weeklyEnabled = em.weeklyReport ?? false;
    const monthlyEnabled = em.monthlyReport ?? false;

    const enabled =
      (reportType === "daily" && dailyEnabled) ||
      (reportType === "weekly" && weeklyEnabled) ||
      (reportType === "monthly" && monthlyEnabled);

    if (enabled) {
      recipients.push({
        userId: m.userId,
        email,
        reportType,
        internalNumbers: parseInternalExtensions(m.internalExtensions),
        reportSettings: {
          includeCallSummaries: rs?.includeCallSummaries ?? false,
          detailed: rs?.detailed ?? false,
          includeAvgValue: rs?.includeAvgValue ?? false,
          includeAvgRating: rs?.includeAvgRating ?? false,
          kpi: rs?.kpi ?? false,
        },
      });
    }
  }

  return recipients;
}

/**
 * Возвращает ID воркспейсов, в которых есть хотя бы один получатель email-отчётов.
 *
 * innerJoin на schema.userWorkspaceSettings намерен: нужны только участники
 * с явно включёнными настройками уведомлений (notificationSettings). Строки
 * без настроек исключаются, в отличие от getEmailReportRecipients, где используется leftJoin.
 */
export async function getWorkspaceIdsWithEmailReportRecipients(): Promise<string[]> {
  const rows = await db
    .selectDistinct({
      workspaceId: schema.workspaceMembers.workspaceId,
    })
    .from(schema.workspaceMembers)
    .innerJoin(schema.user, eq(schema.workspaceMembers.userId, schema.user.id))
    .innerJoin(
      schema.userWorkspaceSettings,
      and(
        eq(schema.workspaceMembers.userId, schema.userWorkspaceSettings.userId),
        eq(schema.workspaceMembers.workspaceId, schema.userWorkspaceSettings.workspaceId),
      ),
    )
    .where(
      and(
        eq(schema.workspaceMembers.status, "active"),
        isNull(schema.user.deletedAt),
        sql`${schema.user.email} IS NOT NULL AND trim(${schema.user.email}) != ''`,
        sql`(
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'email'->>'dailyReport')::boolean, false) = true OR
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'email'->>'weeklyReport')::boolean, false) = true OR
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'email'->>'monthlyReport')::boolean, false) = true
        )`,
      ),
    );

  return rows.map((r) => r.workspaceId).filter((id): id is string => Boolean(id));
}
