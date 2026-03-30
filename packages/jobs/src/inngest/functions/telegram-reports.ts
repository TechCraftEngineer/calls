/**
 * Inngest функция: отправка Telegram-отчётов по звонкам.
 * Запускается каждый час, проверяет настройки времени и отправляет отчёты.
 */

import {
  callsService,
  getReportScheduleSettings,
  getTelegramReportRecipients,
  getWorkspaceIdsWithTelegramReportRecipients,
  settingsService,
  workspaceSettingsRepository,
  workspacesService,
} from "@calls/db";
import { sendMessage } from "@calls/telegram-bot";
import {
  formatTelegramReportHtml,
  type ManagerStats,
  splitTelegramHtmlMessage,
} from "../../reports/format-report";
import { inngest } from "../client";
import { subMonths } from "date-fns";

const TZ = "Europe/Moscow";
const SEND_RETRY_DELAYS_MS = [500, 1000, 2000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sendChunkWithRetry(
  token: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < SEND_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const ok = await sendMessage(token, chatId, text, {
        parseMode: "HTML",
      });
      if (ok) {
        return true;
      }
    } catch {
      // Игнорируем ошибку попытки и повторяем с backoff.
    }

    const delay = SEND_RETRY_DELAYS_MS[attempt];
    if (delay != null) {
      await sleep(delay);
    }
  }

  return false;
}

function formatDateInMoscow(date: Date): string {
  // Используем локальные методы для получения дат в московской таймзоне
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nowInMoscow(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: TZ }));
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
    triggers: [{ cron: `TZ=${TZ} */15 * * * *` }],
  },
  async ({ step }) => {
    const workspaceIds = await step.run(
      "get-workspaces-with-telegram-recipients",
      async () => {
        return getWorkspaceIdsWithTelegramReportRecipients();
      },
    );

    if (workspaceIds.length === 0) {
      return {
        skipped: true,
        reason: "Нет компаний с получателями Telegram-отчётов",
      };
    }

    const now = nowInMoscow();
    const weekend = isWeekend(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentDate = now.getDate();
    const lastDay = getLastDayOfMonth(now);

    let sentCount = 0;
    let hasHardFailure = false;
    const errors: string[] = [];

    for (const workspaceId of workspaceIds) {
      const result = await step.run(
        `process-workspace-${workspaceId}`,
        async () => {
          const ws = await workspacesService.getById(workspaceId);
          const workspaceName = ws?.name ?? workspaceId;

          const { token } =
            await settingsService.getEffectiveTelegramBotToken(workspaceId);
          if (!token?.trim()) {
            return {
              sent: 0,
              errors: [
                `Не настроен токен Telegram-бота для компании "${workspaceName}" (${workspaceId})`,
              ] as string[],
              failed: false,
            };
          }

          const schedule = await getReportScheduleSettings(
            workspaceSettingsRepository,
            workspaceId,
          );

          const reportWorkspaceName = ws?.name ?? undefined;

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
              : !Number.isNaN(monthlyDayNum) && currentDate === monthlyDayNum;
          const monthlySlot = Math.floor(monthlyTime.m / 15) * 15;
          if (
            isMonthlyDay &&
            currentHour === monthlyTime.h &&
            slot === monthlySlot
          ) {
            reportTypesToRun.push("monthly");
          }

          if (reportTypesToRun.length === 0) {
            return { sent: 0, errors: [] as string[], failed: false };
          }

          let sent = 0;
          let failed = false;
          const errs: string[] = [];

          for (const reportType of reportTypesToRun) {
            const recipients = await getTelegramReportRecipients(
              workspaceId,
              reportType,
            );

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

            const ftpSettings =
              await settingsService.getFtpSettings(workspaceId);
            const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

            for (const r of recipients) {
              if (r.skipWeekends && weekend) continue;

              const stats = (await callsService.getEvaluationsStats({
                workspaceId,
                dateFrom: dateFromDb,
                dateTo: dateToDb,
                internalNumbers: r.internalNumbers ?? undefined,
                excludePhoneNumbers:
                  excludePhoneNumbers.length > 0
                    ? excludePhoneNumbers
                    : undefined,
              })) as Record<string, ManagerStats>;

              let lowRatedCalls: Record<string, number> = {};
              if (r.isManagerReport) {
                lowRatedCalls = await callsService.getLowRatedCallsCount({
                  workspaceId,
                  dateFrom: dateFromDb,
                  dateTo: dateToDb,
                  internalNumbers: r.internalNumbers ?? undefined,
                  excludePhoneNumbers:
                    excludePhoneNumbers.length > 0
                      ? excludePhoneNumbers
                      : undefined,
                  maxScore: 3,
                });
              }

              let callSummariesByManager: Record<string, string[]> = {};
              if (r.reportSettings?.includeCallSummaries) {
                callSummariesByManager =
                  await callsService.getCallSummariesByManager({
                    workspaceId,
                    dateFrom: dateFromDb,
                    dateTo: dateToDb,
                    internalNumbers: r.internalNumbers ?? undefined,
                    excludePhoneNumbers:
                      excludePhoneNumbers.length > 0
                        ? excludePhoneNumbers
                        : undefined,
                    limitPerManager: 2,
                  });
              }

              const text = formatTelegramReportHtml({
                stats,
                dateFrom,
                dateTo,
                reportType,
                isManagerReport: r.isManagerReport,
                workspaceName: reportWorkspaceName,
                detailed: r.reportSettings?.detailed ?? false,
                _includeCallSummaries:
                  r.reportSettings?.includeCallSummaries ?? false,
                includeAvgRating: r.reportSettings?.includeAvgRating ?? false,
                includeAvgValue: r.reportSettings?.includeAvgValue ?? false,
                _callSummariesByManager: callSummariesByManager,
                lowRatedCalls,
              });

              const chunks = splitTelegramHtmlMessage(text, 4000);
              let allChunksSent = true;
              const totalChunks = chunks.length;
              for (const [index, chunk] of chunks.entries()) {
                const chunkPrefix =
                  totalChunks > 1
                    ? `<i>Часть ${index + 1} из ${totalChunks}</i>\n`
                    : "";
                const chunkText = `${chunkPrefix}${chunk}`;
                const ok = await sendChunkWithRetry(token, r.chatId, chunkText);
                if (!ok) {
                  allChunksSent = false;
                  break;
                }
              }
              if (allChunksSent) {
                sent++;
              } else {
                failed = true;
                errs.push(
                  `Не удалось отправить отчёт в chat ${r.chatId}: отправка прервана на одной из частей`,
                );
              }
            }
          }

          return { sent, errors: errs, failed };
        },
      );

      sentCount += result.sent;
      errors.push(...result.errors);
      if (result.failed) {
        hasHardFailure = true;
      }
    }

    if (hasHardFailure) {
      throw new Error(
        `Telegram report failed: ${errors.join("; ") || "partial send failure"}`,
      );
    }

    return {
      workspacesProcessed: workspaceIds.length,
      sent: sentCount,
      errors,
      errorsCount: errors.length,
    };
  },
);
