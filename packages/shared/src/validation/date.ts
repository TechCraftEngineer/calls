import { isAfter, isValid } from "date-fns";

/** Строка YYYY-MM-DD, соответствующая реальной дате в календаре (UTC). */
export function isValidCalendarIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parseInt(parts[1] ?? "0", 10);
  const day = parseInt(parts[2] ?? "0", 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    isValid(date) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Строка YYYY-MM-DD не позже сегодняшней даты (UTC). */
export function isNotFutureIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parseInt(parts[1] ?? "0", 10);
  const day = parseInt(parts[2] ?? "0", 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!isValid(date)) return false;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return !isAfter(date, todayUtc);
}
