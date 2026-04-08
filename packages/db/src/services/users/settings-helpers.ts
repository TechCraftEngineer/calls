/**
 * Helpers for user settings processing
 */

import type {
  EvaluationSettings,
  FilterSettings,
  KpiSettings,
  NotificationSettings,
  ReportSettings,
} from "../../schema/user/workspace-settings";
import type { UserUpdateData } from "./types";

interface ParsedSettings {
  filterSettings: Partial<FilterSettings>;
  notificationSettings: Partial<NotificationSettings>;
  reportSettings: Partial<ReportSettings>;
  kpiSettings: Partial<KpiSettings>;
  evaluationSettings: EvaluationSettings | null | undefined;
}

export function parseUserUpdateData(data: UserUpdateData): ParsedSettings {
  const filterSettings: Partial<FilterSettings> = {};
  const notificationSettings: Partial<NotificationSettings> = {};
  const reportSettings: Partial<ReportSettings> = {};
  const kpiSettings: Partial<KpiSettings> = {};

  // Filter settings
  if (data.filterExcludeAnsweringMachine !== undefined) {
    filterSettings.excludeAnsweringMachine = data.filterExcludeAnsweringMachine;
  }
  if (data.filterMinDuration !== undefined) {
    filterSettings.minDuration = data.filterMinDuration;
  }
  if (data.filterMinReplicas !== undefined) {
    filterSettings.minReplicas = data.filterMinReplicas;
  }

  // Telegram notifications
  if (data.telegramDailyReport !== undefined) {
    notificationSettings.telegram = {
      ...notificationSettings.telegram,
      dailyReport: data.telegramDailyReport,
    } as NotificationSettings["telegram"];
  }
  if (data.telegramManagerReport !== undefined) {
    notificationSettings.telegram = {
      ...notificationSettings.telegram,
      managerReport: data.telegramManagerReport,
    } as NotificationSettings["telegram"];
  }
  if (data.telegramWeeklyReport !== undefined) {
    notificationSettings.telegram = {
      ...notificationSettings.telegram,
      weeklyReport: data.telegramWeeklyReport,
    } as NotificationSettings["telegram"];
  }
  if (data.telegramMonthlyReport !== undefined) {
    notificationSettings.telegram = {
      ...notificationSettings.telegram,
      monthlyReport: data.telegramMonthlyReport,
    } as NotificationSettings["telegram"];
  }
  if (data.telegramSkipWeekends !== undefined) {
    notificationSettings.telegram = {
      ...notificationSettings.telegram,
      skipWeekends: data.telegramSkipWeekends,
    } as NotificationSettings["telegram"];
  }

  // MAX notifications
  if (data.maxChatId !== undefined) {
    notificationSettings.max = {
      ...notificationSettings.max,
      chatId: data.maxChatId?.trim() || undefined,
    } as NotificationSettings["max"];
  }
  if (data.maxDailyReport !== undefined) {
    notificationSettings.max = {
      ...notificationSettings.max,
      dailyReport: data.maxDailyReport,
    } as NotificationSettings["max"];
  }
  if (data.maxManagerReport !== undefined) {
    notificationSettings.max = {
      ...notificationSettings.max,
      managerReport: data.maxManagerReport,
    } as NotificationSettings["max"];
  }

  // Email notifications
  if (data.emailDailyReport !== undefined) {
    notificationSettings.email = {
      ...notificationSettings.email,
      dailyReport: data.emailDailyReport,
    } as NotificationSettings["email"];
  }
  if (data.emailWeeklyReport !== undefined) {
    notificationSettings.email = {
      ...notificationSettings.email,
      weeklyReport: data.emailWeeklyReport,
    } as NotificationSettings["email"];
  }
  if (data.emailMonthlyReport !== undefined) {
    notificationSettings.email = {
      ...notificationSettings.email,
      monthlyReport: data.emailMonthlyReport,
    } as NotificationSettings["email"];
  }

  // Report settings
  if (data.reportManagedUserIds !== undefined) {
    reportSettings.managedUserIds = parseManagedUserIds(data.reportManagedUserIds);
  }

  // KPI settings
  if (data.kpiBaseSalary !== undefined) {
    kpiSettings.baseSalary = data.kpiBaseSalary;
  }
  if (data.kpiTargetBonus !== undefined) {
    kpiSettings.targetBonus = data.kpiTargetBonus;
  }
  if (data.kpiTargetTalkTimeMinutes !== undefined) {
    kpiSettings.targetTalkTimeMinutes = data.kpiTargetTalkTimeMinutes;
  }

  // Evaluation settings
  const evaluationSettings =
    data.evaluationTemplateSlug !== undefined
      ? data.evaluationTemplateSlug === null
        ? null
        : {
            templateSlug: data.evaluationTemplateSlug,
            customInstructions: data.evaluationCustomInstructions?.trim() || undefined,
          }
      : undefined;

  return {
    filterSettings,
    notificationSettings,
    reportSettings,
    kpiSettings,
    evaluationSettings,
  };
}

function parseManagedUserIds(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasAnySettingsUpdate(parsed: ParsedSettings): boolean {
  return (
    Object.keys(parsed.filterSettings).length > 0 ||
    Object.keys(parsed.notificationSettings).length > 0 ||
    Object.keys(parsed.reportSettings).length > 0 ||
    Object.keys(parsed.kpiSettings).length > 0 ||
    parsed.evaluationSettings !== undefined
  );
}

export function buildUpsertData(parsed: ParsedSettings) {
  return {
    filterSettings:
      Object.keys(parsed.filterSettings).length > 0 ? parsed.filterSettings : undefined,
    notificationSettings:
      Object.keys(parsed.notificationSettings).length > 0
        ? parsed.notificationSettings
        : undefined,
    reportSettings:
      Object.keys(parsed.reportSettings).length > 0 ? parsed.reportSettings : undefined,
    kpiSettings: Object.keys(parsed.kpiSettings).length > 0 ? parsed.kpiSettings : undefined,
    evaluationSettings: parsed.evaluationSettings,
  };
}
