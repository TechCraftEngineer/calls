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
  compareIds,
  isValidId,
  normalizeId,
  type SafeId,
  safeId,
} from "./utils/id-utils";
export { pluralize } from "./utils/pluralize";
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
export { isValidCalendarIsoDate } from "./validation/date";
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
