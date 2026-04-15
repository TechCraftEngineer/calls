import { isAfter, isValid, parse, startOfToday } from "date-fns";

/** Строка YYYY-MM-DD, соответствующая реальной дате в календаре (UTC). */
export function isValidCalendarIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parse(value, "yyyy-MM-dd", new Date());
  return isValid(date);
}

/** Строка YYYY-MM-DD не позже сегодняшней даты (UTC). */
export function isNotFutureIsoDate(value: string): boolean {
  const date = parse(value, "yyyy-MM-dd", new Date());
  if (!isValid(date)) return false;
  return !isAfter(date, startOfToday());
}
