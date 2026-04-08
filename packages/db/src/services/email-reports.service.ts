/**
 * Email reports service — получатели email-отчётов
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
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
  internalNumbers: string[] | null;
  reportSettings: {
    managedUserIds: string[];
  };
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

async function getInternalNumbersForUserIds(
  workspaceId: string,
  userIds: string[] | null,
): Promise<string[] | null> {
  if (!userIds?.length) return null;

  const users = await db
    .select({
      internalExtensions: schema.user.internalExtensions,
    })
    .from(schema.user)
    .innerJoin(schema.workspaceMembers, eq(schema.user.id, schema.workspaceMembers.userId))
    .where(
      and(
        inArray(schema.user.id, userIds),
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.status, "active"),
        isNull(schema.user.deletedAt),
      ),
    );

  const allNumbers: string[] = [];
  for (const u of users) {
    const nums = parseInternalExtensions(u.internalExtensions);
    if (nums) allNumbers.push(...nums);
  }
  return allNumbers.length > 0 ? [...new Set(allNumbers)] : null;
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
    const managerEnabled = em.managerReport ?? false;

    const isAdmin = m.role === "owner" || m.role === "admin";

    if (reportType === "daily") {
      if (dailyEnabled) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "daily",
          isManagerReport: false,
          internalNumbers: parseInternalExtensions(m.internalExtensions),
          reportSettings: buildReportSettings(rs),
        });
      }
      if (managerEnabled && isAdmin) {
        const managedIds = (rs?.managedUserIds ?? []) as string[];
        const internalNumbers = await getInternalNumbersForUserIds(
          workspaceId,
          managedIds.length > 0 ? managedIds : null,
        );
        recipients.push({
          userId: m.userId,
          email,
          reportType: "daily",
          isManagerReport: true,
          internalNumbers,
          reportSettings: buildReportSettings(rs),
        });
      }
    } else if (reportType === "weekly") {
      if (weeklyEnabled) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "weekly",
          isManagerReport: false,
          internalNumbers: parseInternalExtensions(m.internalExtensions),
          reportSettings: buildReportSettings(rs),
        });
      }
      if (managerEnabled && isAdmin) {
        const managedIds = (rs?.managedUserIds ?? []) as string[];
        const internalNumbers = await getInternalNumbersForUserIds(
          workspaceId,
          managedIds.length > 0 ? managedIds : null,
        );
        recipients.push({
          userId: m.userId,
          email,
          reportType: "weekly",
          isManagerReport: true,
          internalNumbers,
          reportSettings: buildReportSettings(rs),
        });
      }
    } else if (reportType === "monthly") {
      if (monthlyEnabled) {
        recipients.push({
          userId: m.userId,
          email,
          reportType: "monthly",
          isManagerReport: false,
          internalNumbers: parseInternalExtensions(m.internalExtensions),
          reportSettings: buildReportSettings(rs),
        });
      }
      if (managerEnabled && isAdmin) {
        const managedIds = (rs?.managedUserIds ?? []) as string[];
        const internalNumbers = await getInternalNumbersForUserIds(
          workspaceId,
          managedIds.length > 0 ? managedIds : null,
        );
        recipients.push({
          userId: m.userId,
          email,
          reportType: "monthly",
          isManagerReport: true,
          internalNumbers,
          reportSettings: buildReportSettings(rs),
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
