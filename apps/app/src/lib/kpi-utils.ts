/** Utility functions for KPI calculations and formatting. */

/**
 * Рассчитывает дневную цель на основе месячной цели.
 * Формула: месячная_цель / количество_дней_в_месяце
 *
 * @param monthlyTarget - Месячная цель по времени разговоров (в минутах)
 * @param year - Год
 * @param month - Месяц (1-12)
 * @returns Дневная цель (в минутах), округленная до целого числа
 */
export function calculateDailyTarget(monthlyTarget: number, year: number, month: number): number {
  const daysInMonth = calculateDaysInMonth(year, month);
  return Math.round(monthlyTarget / daysInMonth);
}

/**
 * Рассчитывает процент выполнения цели.
 * Формула: min(100, round((фактическое / целевое) * 100))
 *
 * @param actual - Фактическое значение
 * @param target - Целевое значение
 * @returns Процент выполнения (0-100)
 */
export function calculateCompletionPercentage(actual: number, target: number): number {
  if (target <= 0) return 0;
  const percentage = Math.round((actual / target) * 100);
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Рассчитывает количество дней в месяце.
 *
 * @param year - Год
 * @param month - Месяц (1-12)
 * @returns Количество дней в месяце
 */
export function calculateDaysInMonth(year: number, month: number): number {
  // Date(year, month, 0) возвращает последний день предыдущего месяца
  // Date(year, month + 1, 0) возвращает последний день текущего месяца
  return new Date(year, month, 0).getDate();
}

/**
 * Форматирует денежное значение с разделителем тысяч и символом рубля.
 *
 * @param value - Числовое значение
 * @returns Отформатированная строка (например, "10 000 ₽")
 */
export function formatCurrency(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

/**
 * Форматирует дату в формат YYYY-MM-DD (ISO 8601).
 *
 * @param date - Дата (строка или объект Date)
 * @returns Отформатированная строка даты
 */
export function formatDateISO(date: string | Date): string {
  // Для строк в формате YYYY-MM-DD парсим без timezone conversion
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Определяет цвет для отображения на основе процента выполнения.
 * - >= 100: зеленый
 * - >= 80 и < 100: желтый
 * - < 80: красный
 *
 * @param percentage - Процент выполнения
 * @returns Цвет ('green', 'yellow', 'red')
 */
export function getColorByPercentage(percentage: number): "green" | "yellow" | "red" {
  if (percentage >= 100) return "green";
  if (percentage >= 80) return "yellow";
  return "red";
}
