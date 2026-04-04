/** Utility functions for date range serialization and quick filters. */

/**
 * Модель диапазона дат.
 */
export interface DateRange {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
}

/**
 * Типы быстрых фильтров для выбора периода.
 */
export type QuickFilter = "today" | "yesterday" | "last7days" | "last30days" | "currentMonth";

/**
 * Сериализует диапазон дат в URL параметры.
 *
 * @param startDate - Начальная дата в формате YYYY-MM-DD
 * @param endDate - Конечная дата в формате YYYY-MM-DD
 * @returns Объект с параметрами для URL
 */
export function serializeDateRange(startDate: string, endDate: string): Record<string, string> {
  return {
    startDate,
    endDate,
  };
}

/**
 * Десериализует диапазон дат из URL параметров.
 *
 * @param params - Объект с URL параметрами
 * @returns Диапазон дат или null, если параметры невалидны
 */
export function deserializeDateRange(params: Record<string, string | undefined>): DateRange | null {
  const { startDate, endDate } = params;

  // Проверяем наличие обоих параметров
  if (!startDate || !endDate) {
    return null;
  }

  // Проверяем формат дат (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return null;
  }

  // Проверяем валидность дат
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return { startDate, endDate };
}

/**
 * Получает диапазон дат для быстрого фильтра.
 *
 * @param filter - Тип быстрого фильтра
 * @returns Диапазон дат
 */
export function getQuickFilterDates(filter: QuickFilter): DateRange {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  switch (filter) {
    case "today": {
      const todayStr = formatDate(today);
      return { startDate: todayStr, endDate: todayStr };
    }

    case "yesterday": {
      const yesterday = new Date(year, month, day - 1);
      const yesterdayStr = formatDate(yesterday);
      return { startDate: yesterdayStr, endDate: yesterdayStr };
    }

    case "last7days": {
      const sevenDaysAgo = new Date(year, month, day - 6);
      return {
        startDate: formatDate(sevenDaysAgo),
        endDate: formatDate(today),
      };
    }

    case "last30days": {
      const thirtyDaysAgo = new Date(year, month, day - 29);
      return {
        startDate: formatDate(thirtyDaysAgo),
        endDate: formatDate(today),
      };
    }

    case "currentMonth": {
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      return {
        startDate: formatDate(firstDayOfMonth),
        endDate: formatDate(lastDayOfMonth),
      };
    }

    default: {
      // Exhaustive check
      const _exhaustive: never = filter;
      throw new Error(`Unknown filter: ${_exhaustive}`);
    }
  }
}

/**
 * Форматирует дату в формат YYYY-MM-DD.
 *
 * @param date - Объект Date
 * @returns Отформатированная строка даты
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
