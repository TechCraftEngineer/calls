import type { DailyKpiRow } from "@calls/shared";

/**
 * CSV Export utilities for Employee KPI Daily View
 *
 * @example
 * ```typescript
 * // В компоненте ExportButton:
 * import { generateCSV, generateCSVFileName } from '@/lib/csv-export';
 *
 * function handleExport(data: DailyKpiRow[], employeeName: string, startDate: string, endDate: string) {
 *   // Генерируем CSV контент
 *   const csvContent = generateCSV(data);
 *
 *   // Генерируем имя файла
 *   const fileName = generateCSVFileName(employeeName, startDate, endDate);
 *
 *   // Создаем blob и скачиваем
 *   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 *   const url = URL.createObjectURL(blob);
 *   const link = document.createElement('a');
 *   link.href = url;
 *   link.download = fileName;
 *   link.click();
 *   URL.revokeObjectURL(url);
 * }
 * ```
 */

/**
 * Очищает имя сотрудника для использования в имени файла
 * - Нормализация юникод (NFC)
 * - Удаление/замена символов недопустимых в именах файлов (\/:*?"<>|)
 * - Свертывание пробелов в один
 * - Обрезка до 100 символов
 * - Fallback на "employee" если результат пустой
 */
export function sanitizeFileName(name: string): string {
  // Нормализация юникод (NFC)
  let sanitized = name.normalize("NFC");

  // Удаление/замена символов недопустимых в именах файлов
  sanitized = sanitized.replace(/[\\/:*?"<>|]/g, "-");

  // Свертывание пробелов в один
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Обрезка до 100 символов
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim();
  }

  // Fallback на "employee" если результат пустой или состоит только из дефисов
  if (!sanitized || /^-+$/.test(sanitized)) {
    return "employee";
  }

  return sanitized;
}

/**
 * Генерирует CSV файл из данных KPI по дням
 * - Заголовок с 11 колонками
 * - Точка с запятой как разделитель
 * - UTF-8 BOM для корректного отображения кириллицы
 */
export function generateCSV(data: DailyKpiRow[]): string {
  // UTF-8 BOM
  const BOM = "\uFEFF";

  // Заголовок с 11 колонками
  const header = [
    "Дата",
    "Сотрудник",
    "Email",
    "Входящие",
    "Исходящие",
    "Пропущенные",
    "Всего звонков",
    "Время разговоров (мин)",
    "Цель (мин)",
    "Выполнение (%)",
    "Бонус (₽)",
  ].join(";");

  // Форматирование данных для каждой строки
  const rows = data.map((row) => {
    return [
      row.date,
      row.employeeName,
      row.employeeEmail,
      row.incoming.toString(),
      row.outgoing.toString(),
      row.missed.toString(),
      row.totalCalls.toString(),
      row.actualTalkTimeMinutes.toString(),
      row.targetTalkTimeMinutes.toString(),
      row.completionPercentage.toString(),
      row.dailyBonus.toString(),
    ].join(";");
  });

  // Если нет данных, возвращаем только заголовок
  if (rows.length === 0) {
    return `${BOM}${header}`;
  }

  return `${BOM}${header}\n${rows.join("\n")}`;
}

/**
 * Валидирует и очищает дату для использования в имени файла
 * @param dateStr - Строка даты в формате YYYY-MM-DD
 * @returns Очищенная дата или 'invalid' если дата невалидна
 */
function validateAndSanitizeDate(dateStr: string): string {
  // Проверяем формат YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return "невалидная_дата";
  }

  // Проверяем, что дата реальная
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));

  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() + 1 !== month ||
    dateObj.getUTCDate() !== day
  ) {
    return "невалидная_дата";
  }

  return dateStr;
}

/**
 * Генерирует имя файла для CSV экспорта
 * Формат: kpi-daily-{sanitizedEmployeeName}-{startDate}-{endDate}.csv
 */
export function generateCSVFileName(
  employeeName: string,
  startDate: string,
  endDate: string,
): string {
  const sanitizedName = sanitizeFileName(employeeName);
  const sanitizedStartDate = validateAndSanitizeDate(startDate);
  const sanitizedEndDate = validateAndSanitizeDate(endDate);
  return `kpi-daily-${sanitizedName}-${sanitizedStartDate}-${sanitizedEndDate}.csv`;
}
