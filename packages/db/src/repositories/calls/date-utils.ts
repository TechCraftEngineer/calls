/**
 * Парсит строку даты в UTC Date объект
 * Поддерживает форматы:
 * - YYYY-MM-DD (парсится как UTC midnight)
 * - YYYY-MM-DDTHH:MM:SS или YYYY-MM-DD HH:MM:SS (добавляется Z для UTC)
 * - Полный ISO с timezone (Z или ±HH:MM) - парсится напрямую
 */
export function parseDateToUTC(dateStr: string): Date {
  // 1) YYYY-MM-DD: парсим как UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    return date;
  }

  // 2) Проверяем наличие timezone индикатора (Z или ±HH:MM)
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
  if (hasTimezone) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    return date;
  }

  // 3) Есть время но нет timezone - добавляем Z для UTC
  const dateWithZ = dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
  const date = new Date(dateWithZ);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}
