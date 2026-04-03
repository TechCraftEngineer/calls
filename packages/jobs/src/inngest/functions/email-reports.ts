/**
 * Inngest функция: отправка email-отчётов по звонкам.
 * Запускается каждые 15 минут, проверяет настройки времени и отправляет отчёты.
 */

import {
  callsService,
  getEmailReportRecipients,
  getReportScheduleSettings,
  getWorkspaceIdsWithEmailReportRecipients,
  type ManagerStatsRow,
  settingsService,
  workspaceSettingsRepository,
} from "@calls/db";
import { type ManagerStats, ReportEmail, type ReportEmailProps, sendEmail } from "@calls/emails";
import { subMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { inngest } from "../client";

const TZ = "Europe/Moscow";

function formatDateInMoscow(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  const safeLocal =
    local.length <= 2 ? (local[0] ?? "*") : `${local[0] ?? "*"}***${local.at(-1) ?? "*"}`;
  const [domName, domTld] = domain.split(".");
  if (!domName) return "***";
  const safeDomName =
    domName.length <= 2 ? (domName[0] ?? "*") : `${domName[0] ?? "*"}***${domName.at(-1) ?? "*"}`;
  return `${safeLocal}@${safeDomName}.${domTld ?? "***"}`;
}

function nowInMoscow(): Date {
  const now = new Date();
  return toZonedTime(now, TZ);
}

function parseTimeHHMM(s: string): { h: number; m: number } {
  const m = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(s?.trim() ?? "");
  if (!m) return { h: 18, m: 0 };
  return {
    h: parseInt(m[1] ?? "18", 10),
    m: parseInt(m[2] ?? "0", 10),
  };
}

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function getLastDayOfMonth(d: Date): number {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return next.getDate();
}

export const emailReportsFn = inngest.createFunction(
  {
    id: "email-reports",
    name: "Email отчёты по звонкам",
    retries: 2,
    triggers: [{ cron: `TZ=${TZ} */15 * * * *` }],
  },
  async ({ step }) => {
    const workspaceIds = await step.run("get-workspaces-with-email-reports", async () => {
      return getWorkspaceIdsWithEmailReportRecipients();
    });

    if (workspaceIds.length === 0) {
      return {
        skipped: true,
        reason: "Нет рабочих пространств с email-отчётами",
      };
    }

    const now = nowInMoscow();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentDate = now.getDate();
    const lastDay = getLastDayOfMonth(now);

    let sentCount = 0;
    const errors: string[] = [];

    for (const workspaceId of workspaceIds) {
      const result = await step.run(`process-workspace-email-${workspaceId}`, async () => {
        const schedule = await getReportScheduleSettings(workspaceSettingsRepository, workspaceId);

        const reportTypesToRun: Array<"daily" | "weekly" | "monthly"> = [];

        const slot = Math.floor(currentMinute / 15) * 15;

        const dailyTime = parseTimeHHMM(schedule.reportDailyTime);
        const dailySlot = Math.floor(dailyTime.m / 15) * 15;
        if (currentHour === dailyTime.h && slot === dailySlot) {
          reportTypesToRun.push("daily");
        }

        const weeklyDay = WEEKDAY_MAP[schedule.reportWeeklyDay] ?? 5;
        const weeklyTime = parseTimeHHMM(schedule.reportWeeklyTime);
        const weeklySlot = Math.floor(weeklyTime.m / 15) * 15;
        if (currentDay === weeklyDay && currentHour === weeklyTime.h && slot === weeklySlot) {
          reportTypesToRun.push("weekly");
        }

        const monthlyTime = parseTimeHHMM(schedule.reportMonthlyTime);
        const monthlyDayNum = parseInt(schedule.reportMonthlyDay, 10);
        const isMonthlyDay =
          schedule.reportMonthlyDay === "last"
            ? currentDate === lastDay
            : !Number.isNaN(monthlyDayNum) && currentDate === monthlyDayNum;
        const monthlySlot = Math.floor(monthlyTime.m / 15) * 15;
        if (isMonthlyDay && currentHour === monthlyTime.h && slot === monthlySlot) {
          reportTypesToRun.push("monthly");
        }

        if (reportTypesToRun.length === 0) {
          return { sent: 0, errors: [] as string[] };
        }

        let sent = 0;
        const errs: string[] = [];

        for (const reportType of reportTypesToRun) {
          const recipients = await getEmailReportRecipients(workspaceId, reportType);

          let dateFrom: Date;
          let dateTo: Date;
          let dateFromString: string;
          let dateToString: string;

          if (reportType === "daily") {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            dateFrom = d;
            dateTo = d;
            dateFromString = formatDateInMoscow(d);
            dateToString = dateFromString;
          } else if (reportType === "weekly") {
            dateFrom = new Date(now);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateTo = new Date(now);
            dateFromString = formatDateInMoscow(dateFrom);
            dateToString = formatDateInMoscow(dateTo);
          } else {
            dateFrom = subMonths(new Date(now), 1);
            dateTo = new Date(now);
            dateFromString = formatDateInMoscow(dateFrom);
            dateToString = formatDateInMoscow(dateTo);
          }

          const dateFromDb = `${dateFromString} 00:00:00`;
          const dateToDb = `${dateToString} 23:59:59`;

          const ftpSettings = await settingsService.getFtpSettings(workspaceId);
          const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

          for (const r of recipients) {
            const stats = (await callsService.getEvaluationsStats({
              workspaceId,
              dateFrom: dateFromDb,
              dateTo: dateToDb,
              internalNumbers: r.internalNumbers ?? undefined,
              excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
            })) as Record<string, ManagerStatsRow>;

            const enrichedStats = (await callsService.enrichStatsWithKpi(
              stats,
              workspaceId,
              reportType,
            )) as Record<string, ManagerStats>;

            try {
              await sendEmail({
                to: [r.email],
                subject: `Отчёт по звонкам: ${dateFromString} — ${dateToString}`,
                react: ReportEmail({
                  reportType,
                  username: undefined,
                  stats: enrichedStats,
                  includeKpi: r.reportSettings.kpi,
                  dateFrom,
                  dateTo,
                }),
              });
              sent++;
            } catch (e) {
              const identifier = r.userId ?? maskEmail(r.email);
              errs.push(
                `Не удалось отправить на получателя ${identifier}: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
        }

        return { sent, errors: errs };
      });

      sentCount += result.sent;
      errors.push(...result.errors);
    }

    return {
      workspacesProcessed: workspaceIds.length,
      sent: sentCount,
      errors,
      errorsCount: errors.length,
    };
  },
);
