/**
 * Отчеты - модуль для форматирования отчетов
 */

// Типы
export type {
  ManagerStats,
  PreparedStats,
  FormatReportParams,
  StatsTotals,
  PreparedStatsResult,
} from "./types";

// Основные функции форматирования
export { formatTelegramReport } from "./telegram-formatter";
export { formatTelegramReportHtml } from "./html-formatter";
export { splitTelegramHtmlMessage } from "./message-splitter";

// Утилиты
export {
  formatValue,
  formatScore,
  escapeHtml,
  pluralizeCalls,
  getReportTypeLabel,
  validateReportParams,
} from "./utils";

// Обработка статистики
export {
  prepareStats,
  computeOverallAverages,
} from "./stats-processor";
