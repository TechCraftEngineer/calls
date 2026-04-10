/**
 * Отчеты - модуль для форматирования отчетов
 */

export { formatTelegramReportHtml } from "./html-formatter";
export { splitTelegramHtmlMessage } from "./message-splitter";
// Обработка статистики
export {
  computeOverallAverages,
  prepareStats,
} from "./stats-processor";
// Основные функции форматирования
export { formatTelegramReport } from "./telegram-formatter";
// Типы
export type {
  FormatReportParams,
  ManagerStats,
  PreparedStats,
  PreparedStatsResult,
  StatsTotals,
} from "./types";
// Утилиты
export {
  escapeHtml,
  formatScore,
  formatValue,
  getReportTypeLabel,
  pluralizeCalls,
  validateReportParams,
} from "./utils";
