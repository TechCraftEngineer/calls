/** Строка YYYY-MM-DD, соответствующая реальной дате в календаре (UTC). */
export function isValidCalendarIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Строка YYYY-MM-DD не позже сегодняшней даты (UTC). */
export function isNotFutureIsoDate(value: string): boolean {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) <= todayUtc;
}
