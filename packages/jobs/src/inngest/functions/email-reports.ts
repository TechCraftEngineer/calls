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
  workspacesService,
} from "@calls/db";
import { type ManagerStats, ReportEmail, sendEmail } from "@calls/emails";
import {
  formatDateInMoscow,
  formatReportSubject,
  getLastDayOfMonth,
  isWeekend,
  maskEmail,
  nowInMoscow,
  parseTimeHHMM,
  WEEKDAY_MAP,
} from "@calls/shared";
import { subMonths } from "date-fns";
import { inngest } from "../client";

const TZ = "Europe/Moscow";

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
    const weekend = isWeekend(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentDate = now.getDate();
    const lastDay = getLastDayOfMonth(now);

    let sentCount = 0;
    const errors: string[] = [];

    for (const workspaceId of workspaceIds) {
      const result = await step.run(`process-workspace-email-${workspaceId}`, async () => {
        const ws = await workspacesService.getById(workspaceId);
        const workspaceName = ws?.name ?? undefined;
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
            // Skip if user-level or workspace-level skipWeekends is enabled and it's a weekend
            const shouldSkipWeekend = r.skipWeekends || schedule.reportSkipWeekends;
            if (shouldSkipWeekend && weekend) continue;

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

            // Получаем список звонков с низкой оценкой для менеджерских отчетов
            let lowRatedCalls: Record<string, number> = {};
            if (r.isManagerReport) {
              lowRatedCalls = await callsService.getLowRatedCallsCount({
                workspaceId,
                dateFrom: dateFromDb,
                dateTo: dateToDb,
                internalNumbers: r.internalNumbers ?? undefined,
                excludePhoneNumbers:
                  excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
                maxScore: 3,
              });
            }

            try {
              const subject = formatReportSubject(reportType, dateFrom, dateTo);
              await sendEmail({
                to: [r.email],
                subject,
                react: ReportEmail({
                  reportType,
                  username: undefined,
                  stats: enrichedStats,
                  avgManagerScore: r.isManagerReport,
                  dateFrom,
                  dateTo,
                  isManagerReport: r.isManagerReport,
                  lowRatedCalls,
                  workspaceName,
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
