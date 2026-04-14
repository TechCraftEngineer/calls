/** Утилиты для настроек отчётов */

export type WeekDay = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export const WEEK_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getReportWeeklyDay(day: string): WeekDay {
  if (WEEK_DAYS.includes(day as WeekDay)) return day as WeekDay;
  return "fri";
}
