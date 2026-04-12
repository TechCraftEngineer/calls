import { workspaceSettingsRepository } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

const TIME_RE = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const WEEKDAY_SET = new Set(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);

export const getReportScheduleSettings = workspaceProcedure.handler(async ({ context }) => {
  const [dailyTime, weeklyDay, weeklyTime, monthlyDay, monthlyTime, skipWeekends] =
    await Promise.all([
      workspaceSettingsRepository.findByKeyWithDefault(
        "report_daily_time",
        context.workspaceId,
        "18:00",
      ),
      workspaceSettingsRepository.findByKeyWithDefault(
        "report_weekly_day",
        context.workspaceId,
        "fri",
      ),
      workspaceSettingsRepository.findByKeyWithDefault(
        "report_weekly_time",
        context.workspaceId,
        "18:10",
      ),
      workspaceSettingsRepository.findByKeyWithDefault(
        "report_monthly_day",
        context.workspaceId,
        "last",
      ),
      workspaceSettingsRepository.findByKeyWithDefault(
        "report_monthly_time",
        context.workspaceId,
        "18:20",
      ),
      workspaceSettingsRepository.findByKeyWithDefault(
        "report_skip_weekends",
        context.workspaceId,
        "false",
      ),
    ]);

  const normTime = (v: string | null) => {
    const s = (v ?? "").trim();
    return TIME_RE.test(s) ? s : "18:00";
  };

  const normWeeklyDay = (v: string | null) => {
    const s = (v ?? "").trim().toLowerCase();
    return WEEKDAY_SET.has(s) ? s : "fri";
  };

  const normMonthlyDay = (v: string | null) => {
    const s = (v ?? "").trim().toLowerCase();
    if (s === "last") return "last";
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n) || n < 1 || n > 31) return "last";
    return String(n);
  };

  const normBoolean = (v: string | null) => {
    const s = (v ?? "").trim().toLowerCase();
    return s === "true" || s === "1";
  };

  return {
    reportDailyTime: normTime(dailyTime),
    reportWeeklyDay: normWeeklyDay(weeklyDay),
    reportWeeklyTime: normTime(weeklyTime),
    reportMonthlyDay: normMonthlyDay(monthlyDay),
    reportMonthlyTime: normTime(monthlyTime),
    reportSkipWeekends: normBoolean(skipWeekends),
  };
});
