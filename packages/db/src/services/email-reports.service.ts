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
  /** managerReport = сводка по всем менеджерам (для админов) */
  isManagerReport: boolean;
  /** User-level skipWeekends setting */
  skipWeekends: boolean;
  reportSettings: {
    managedUserIds: string[];
  };
  internalNumbers?: string[] | null;
}

function buildReportSettings(rs: ReportSettings) {
  return {
    managedUserIds: rs?.managedUserIds ?? [],
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
      role: schema.workspaceMembers.role,
      email: schema.user.email,
      internalExtensions: schema.user.internalExtensions,
      notificationSettings: schema.userWorkspaceSettings.notificationSettings,
      reportSettings: schema.userWorkspaceSettings.reportSettings,
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
    const tg = ns?.telegram ?? {};

    const dailyEnabled = em.dailyReport ?? false;
    const weeklyEnabled = em.weeklyReport ?? false;
    const monthlyEnabled = em.monthlyReport ?? false;
    const managerEnabled = em.managerReport ?? false;
    // skipWeekends is a shared preference stored in telegram settings
    const skipWeekends = tg.skipWeekends ?? false;

    const isAdmin = m.role === "owner" || m.role === "admin";

    const internalNumbers = parseInternalExtensions(m.internalExtensions ?? null);

    if (reportType === "daily") {
      if (dailyEnabled) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "daily",
          isManagerReport: false,
          skipWeekends,
          reportSettings: buildReportSettings(rs),
          internalNumbers,
        });
      }
      if (managerEnabled && isAdmin) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "daily",
          isManagerReport: true,
          skipWeekends,
          reportSettings: buildReportSettings(rs),
          internalNumbers,
        });
      }
    } else if (reportType === "weekly") {
      if (weeklyEnabled) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "weekly",
          isManagerReport: false,
          skipWeekends,
          reportSettings: buildReportSettings(rs),
          internalNumbers,
        });
      }
      if (managerEnabled && isAdmin) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "weekly",
          isManagerReport: true,
          skipWeekends,
          reportSettings: buildReportSettings(rs),
          internalNumbers,
        });
      }
    } else if (reportType === "monthly") {
      if (monthlyEnabled) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "monthly",
          isManagerReport: false,
          skipWeekends,
          reportSettings: buildReportSettings(rs),
          internalNumbers,
        });
      }
      if (managerEnabled && isAdmin) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "monthly",
          isManagerReport: true,
          skipWeekends,
          reportSettings: buildReportSettings(rs),
          internalNumbers,
        });
      }
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
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'email'->>'monthlyReport')::boolean, false) = true OR
          (
            COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'email'->>'managerReport')::boolean, false) = true AND
            ${schema.workspaceMembers.role} IN ('owner', 'admin')
          )
        )`,
      ),
    );

  return rows.map((r) => r.workspaceId).filter((id): id is string => Boolean(id));
}
