import { isAfter, isValid } from "date-fns";

/**
 * Парсит строку YYYY-MM-DD в UTC Date или возвращает null если формат неверный
 */
function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parseInt(parts[1] ?? "0", 10);
  const day = parseInt(parts[2] ?? "0", 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (!isValid(date)) return null;
  if (date.getUTCFullYear() !== year) return null;
  if (date.getUTCMonth() !== month - 1) return null;
  if (date.getUTCDate() !== day) return null;

  return date;
}

/** Строка YYYY-MM-DD, соответствующая реальной дате в календаре (UTC). */
export function isValidCalendarIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

/** Строка YYYY-MM-DD не позже сегодняшней даты (UTC). */
export function isNotFutureIsoDate(value: string): boolean {
  const date = parseIsoDate(value);
  if (!date) return false;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return !isAfter(date, todayUtc);
}
