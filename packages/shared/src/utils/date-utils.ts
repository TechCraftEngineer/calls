import { startOfDay, subDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const TZ = "Europe/Moscow";

/** Форматирует дату в московском времени (YYYY-MM-DD) */
export function formatDateInMoscow(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

/** Возвращает текущую дату/время в московском часовом поясе */
export function nowInMoscow(): Date {
  return toZonedTime(new Date(), TZ);
}

/** Возвращает последний день месяца для указанной даты */
export function getLastDayOfMonth(date: Date): number {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return nextMonth.getDate();
}

/** Парсит время в формате HH:MM */
export function parseTimeHHMM(timeStr: string): { h: number; m: number } {
  const match = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(timeStr?.trim() ?? "");
  if (!match) return { h: 18, m: 0 };
  return {
    h: Number.parseInt(match[1] ?? "18", 10),
    m: Number.parseInt(match[2] ?? "0", 10),
  };
}

/** Проверяет, является ли день выходным (суббота или воскресенье) */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Маппинг дней недели на числа */
export const WEEKDAY_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
} as const satisfies Record<string, number>;

/** Возвращает диапазон дат для синхронизации (по умолчанию последние 7 дней) */
export function getDefaultSyncDateRange(): { fromStr: string; todayStr: string } {
  const today = nowInMoscow();
  const todayStart = startOfDay(today);
  const fromDate = subDays(todayStart, 7);
  return {
    fromStr: formatDateInMoscow(fromDate),
    todayStr: formatDateInMoscow(todayStart),
  };
}
