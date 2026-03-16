/**
 * Inngest функция: отправка Telegram-отчётов по звонкам.
 * Запускается каждый час, проверяет настройки времени и отправляет отчёты.
 */

import {
  callsService,
  getReportScheduleSettings,
  getTelegramReportRecipients,
  promptsRepository,
  settingsService,
  workspacesService,
} from "@calls/db";
import { sendMessage } from "@calls/telegram-bot";
import type { ManagerStats } from "../../reports/format-report";
import { formatTelegramReport } from "../../reports/format-report";
import { inngest } from "../client";

const TZ = "Europe/Moscow";

function formatDateInMoscow(date: Date): string {
  // Используем локальные методы для получения дат в московской таймзоне
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nowInMoscow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
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

export const telegramReportsFn = inngest.createFunction(
  {
    id: "telegram-reports",
    name: "Telegram отчёты по звонкам",
    retries: 2,
  },
  { cron: `TZ=${TZ} */15 * * * *` },
  async ({ step }) => {
    const workspaceIds = await step.run(
      "get-workspaces-with-telegram",
      async () => {
        return settingsService.getWorkspaceIdsWithTelegramBot();
      },
    );

    if (workspaceIds.length === 0) {
      return { skipped: true, reason: "Нет воркспейсов с Telegram ботом" };
    }

    const now = nowInMoscow();
    const weekend = isWeekend(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentDate = now.getDate();
    const lastDay = getLastDayOfMonth(now);

    let sentCount = 0;
    const errors: string[] = [];

    for (const workspaceId of workspaceIds) {
      const result = await step.run(
        `process-workspace-${workspaceId}`,
        async () => {
          const token = await settingsService.getDecryptedBotToken(
            "telegram_bot_token",
            workspaceId,
          );
          if (!token?.trim()) {
            return { sent: 0, errors: [] as string[] };
          }

          const schedule = await getReportScheduleSettings(
            promptsRepository,
            workspaceId,
          );

          const ws = await workspacesService.getById(workspaceId);
          const workspaceName = ws?.name ?? undefined;

          const reportTypesToRun: Array<"daily" | "weekly" | "monthly"> = [];

          // Совпадение по 15-мин окну (cron */15)
          const slot = Math.floor(currentMinute / 15) * 15;

          const dailyTime = parseTimeHHMM(schedule.reportDailyTime);
          const dailySlot = Math.floor(dailyTime.m / 15) * 15;
          if (currentHour === dailyTime.h && slot === dailySlot) {
            reportTypesToRun.push("daily");
          }

          const weeklyDay = WEEKDAY_MAP[schedule.reportWeeklyDay] ?? 5;
          const weeklyTime = parseTimeHHMM(schedule.reportWeeklyTime);
          const weeklySlot = Math.floor(weeklyTime.m / 15) * 15;
          if (
            currentDay === weeklyDay &&
            currentHour === weeklyTime.h &&
            slot === weeklySlot
          ) {
            reportTypesToRun.push("weekly");
          }

          const monthlyTime = parseTimeHHMM(schedule.reportMonthlyTime);
          const monthlyDayNum = parseInt(schedule.reportMonthlyDay, 10);
          const isMonthlyDay =
            schedule.reportMonthlyDay === "last"
              ? currentDate === lastDay
              : !isNaN(monthlyDayNum) && currentDate === monthlyDayNum;
          const monthlySlot = Math.floor(monthlyTime.m / 15) * 15;
          if (
            isMonthlyDay &&
            currentHour === monthlyTime.h &&
            slot === monthlySlot
          ) {
            reportTypesToRun.push("monthly");
          }

          if (reportTypesToRun.length === 0) {
            return { sent: 0, errors: [] as string[] };
          }

          let sent = 0;
          const errs: string[] = [];

          for (const reportType of reportTypesToRun) {
            const recipients = await getTelegramReportRecipients(
              workspaceId,
              reportType,
            );

            let dateFrom: string;
            let dateTo: string;

            if (reportType === "daily") {
              const d = new Date(now);
              d.setDate(d.getDate() - 1);
              dateFrom = formatDateInMoscow(d);
              dateTo = dateFrom;
            } else if (reportType === "weekly") {
              const d = new Date(now);
              d.setDate(d.getDate() - 7);
              dateFrom = formatDateInMoscow(d);
              dateTo = formatDateInMoscow(now);
            } else {
              const d = new Date(now);
              d.setMonth(d.getMonth() - 1);
              dateFrom = formatDateInMoscow(d);
              dateTo = formatDateInMoscow(now);
            }

            const dateFromDb = `${dateFrom} 00:00:00`;
            const dateToDb = `${dateTo} 23:59:59`;

            for (const r of recipients) {
              if (r.skipWeekends && weekend) continue;

              const stats = (await callsService.getEvaluationsStats({
                workspaceId,
                dateFrom: dateFromDb,
                dateTo: dateToDb,
                internalNumbers: r.internalNumbers ?? undefined,
              })) as Record<string, ManagerStats>;

              const text = formatTelegramReport({
                stats,
                dateFrom,
                dateTo,
                reportType,
                isManagerReport: r.isManagerReport,
                workspaceName,
              });

              const ok = await sendMessage(token, r.chatId, text);
              if (ok) {
                sent++;
              } else {
                errs.push(`Не удалось отправить в chat ${r.chatId}`);
              }
            }
          }

          return { sent, errors: errs };
        },
      );

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
