/**
 * Shared utilities and types
 */

export {
  DEFAULT_EVALUATION_TEMPLATE_SLUG,
  EVALUATION_TEMPLATE_SLUGS,
} from "./evaluation";
export type { DailyKpiRow } from "./kpi";
export { formatReportSubject, type ReportType } from "./reports";
export { generateWorkspaceSlug } from "./slug";
export { buildCompanyContext } from "./utils/company-context";
export {
  formatDateInMoscow,
  getDefaultSyncDateRange,
  getLastDayOfMonth,
  isWeekend,
  nowInMoscow,
  parseTimeHHMM,
  WEEKDAY_MAP,
} from "./utils/date-utils";
export { formatOptional, maskEmail } from "./utils/format";
export {
  compareIds,
  isValidId,
  normalizeId,
  type SafeId,
  safeId,
} from "./utils/id-utils";
export { measureTime, measureTimeSync, sleep } from "./utils/performance";
export { pluralize } from "./utils/pluralize";
export { replaceSpeakersWithRoles } from "./utils/speaker-mapping";
export {
  companyContextSchema,
  isValidEmail,
  isValidUserId,
  isValidUuid,
  isValidWorkspaceId,
  userIdSchema,
  uuidSchema,
  workspaceIdSchema,
} from "./validation";
export { isNotFutureIsoDate, isValidCalendarIsoDate } from "./validation/date";
export {
  validateFtpCredentials,
  validateFtpHost,
  validateFtpPassword,
  validateFtpUser,
} from "./validation/ftp";
export { validateTelegramBotToken } from "./validation/telegram";
export {
  generateSecureSecret,
  WEBHOOK_SECRET_BYTES,
  WEBHOOK_SECRET_MIN_LENGTH,
} from "./webhook";
