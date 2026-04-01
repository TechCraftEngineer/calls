/**
 * Форматирование текста отчёта по звонкам для Telegram
 * 
 * @deprecated Этот файл заменен модульной структурой. 
 * Используйте импорты из ./index.ts вместо прямого импорта из этого файла.
 */

// Реэкспорт всех функций из новой модульной структуры для обратной совместимости
export {
  // Типы
  type ManagerStats,
  type PreparedStats,
  type FormatReportParams,
  type StatsTotals,
  type PreparedStatsResult,
  
  // Основные функции
  formatTelegramReport,
  formatTelegramReportHtml,
  splitTelegramHtmlMessage,
  
  // Утилиты
  formatValue,
  formatScore,
  escapeHtml,
  pluralizeCalls,
  getReportTypeLabel,
  validateReportParams,
  
  // Обработка статистики
  prepareStats,
  computeOverallAverages,
  calculateTotalMinutes,
  calculateManagerTotalMinutes,
} from "./index";
