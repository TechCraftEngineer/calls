/**
 * Форматирование текста отчёта по звонкам для Telegram
 *
 * @deprecated Этот файл заменен модульной структурой.
 * Используйте импорты из ./index.ts вместо прямого импорта из этого файла.
 */

// Реэкспорт всех функций из новой модульной структуры для обратной совместимости
export {
  computeOverallAverages,
  escapeHtml,
  type FormatReportParams,
  formatScore,
  // Основные функции
  formatTelegramReport,
  formatTelegramReportHtml,
  // Утилиты
  formatValue,
  getReportTypeLabel,
  // Типы
  type ManagerStats,
  type PreparedStats,
  type PreparedStatsResult,
  pluralizeCalls,
  // Обработка статистики
  prepareStats,
  type StatsTotals,
  splitTelegramHtmlMessage,
  validateReportParams,
} from "./index";
