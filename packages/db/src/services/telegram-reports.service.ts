/**
 * Telegram reports service - получатели отчётов и настройки времени
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type { NotificationSettings, ReportSettings } from "../schema/user/workspace-settings";

export type ReportType = "daily" | "weekly" | "monthly";

export interface ReportSettingsForRecipient {
  managedUserIds: string[];
}

export interface TelegramReportRecipient {
  userId: string;
  chatId: string;
  reportType: ReportType;
  /** managerReport = сводка по всем менеджерам (для админов) */
  isManagerReport: boolean;
  skipWeekends: boolean;
  /** Настройки отчёта (только для isManagerReport) */
  reportSettings?: ReportSettingsForRecipient;
  internalNumbers?: string[] | null;
}

function buildReportSettings(rs: ReportSettings): ReportSettingsForRecipient {
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
 * Возвращает пользователей воркспейса, которым нужно отправить отчёт указанного типа.
 */
export async function getTelegramReportRecipients(
  workspaceId: string,
  reportType: ReportType,
): Promise<TelegramReportRecipient[]> {
  const members = await db
    .select({
      userId: schema.workspaceMembers.userId,
      role: schema.workspaceMembers.role,
      telegramChatId: schema.user.telegramChatId,
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
      ),
    );

  const recipients: TelegramReportRecipient[] = [];

  for (const m of members) {
    const chatId = m.telegramChatId?.trim();
    if (!chatId) continue;

    const ns = (m.notificationSettings ?? {}) as NotificationSettings;
    const tg = ns?.telegram ?? {};
    const rs = (m.reportSettings ?? {}) as ReportSettings;

    const dailyEnabled = tg.dailyReport ?? false;
    const weeklyEnabled = tg.weeklyReport ?? false;
    const monthlyEnabled = tg.monthlyReport ?? false;
    const managerEnabled = tg.managerReport ?? false;
    const skipWeekends = tg.skipWeekends ?? false;

    const isAdmin = m.role === "owner" || m.role === "admin";

    const internalNumbers = parseInternalExtensions(m.internalExtensions ?? null);

    if (reportType === "daily") {
      if (dailyEnabled) {
        recipients.push({
          userId: m.userId,
          chatId,
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
          chatId,
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
          chatId,
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
          chatId,
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
          chatId,
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
          chatId,
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
 * Возвращает ID воркспейсов, где есть хотя бы один получатель Telegram-отчётов.
 */
export async function getWorkspaceIdsWithTelegramReportRecipients(): Promise<string[]> {
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
        sql`${schema.user.telegramChatId} IS NOT NULL AND trim(${schema.user.telegramChatId}) != ''`,
        sql`(
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'telegram'->>'dailyReport')::boolean, false) = true OR
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'telegram'->>'weeklyReport')::boolean, false) = true OR
          COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'telegram'->>'monthlyReport')::boolean, false) = true OR
          (
            COALESCE((${schema.userWorkspaceSettings.notificationSettings}->'telegram'->>'managerReport')::boolean, false) = true AND
            ${schema.workspaceMembers.role} IN ('owner', 'admin')
          )
        )`,
      ),
    );

  return rows.map((r) => r.workspaceId).filter((id): id is string => Boolean(id));
}

export interface ReportScheduleSettings {
  reportDailyTime: string;
  reportWeeklyDay: string;
  reportWeeklyTime: string;
  reportMonthlyDay: string;
  reportMonthlyTime: string;
}

/**
 * Получить настройки времени отчётов для воркспейса.
 */
export async function getReportScheduleSettings(
  settingsRepository: {
    findByKeyWithDefault: (k: string, w: string, d?: string) => Promise<string | null>;
  },
  workspaceId: string,
): Promise<ReportScheduleSettings> {
  const [dailyTime, weeklyDay, weeklyTime, monthlyDay, monthlyTime] = await Promise.all([
    settingsRepository.findByKeyWithDefault("report_daily_time", workspaceId, "18:00"),
    settingsRepository.findByKeyWithDefault("report_weekly_day", workspaceId, "fri"),
    settingsRepository.findByKeyWithDefault("report_weekly_time", workspaceId, "18:10"),
    settingsRepository.findByKeyWithDefault("report_monthly_day", workspaceId, "last"),
    settingsRepository.findByKeyWithDefault("report_monthly_time", workspaceId, "18:20"),
  ]);

  const normTime = (v: string | null) => {
    const s = v ?? "";
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s) ? s.trim() : "18:00";
  };

  return {
    reportDailyTime: normTime(dailyTime) || "18:00",
    reportWeeklyDay: (weeklyDay ?? "fri").toLowerCase(),
    reportWeeklyTime: normTime(weeklyTime) || "18:10",
    reportMonthlyDay: monthlyDay ?? "last",
    reportMonthlyTime: normTime(monthlyTime) || "18:20",
  };
}
