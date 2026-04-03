/**
 * Shared utilities and types
 */

export { generateWorkspaceSlug } from "./slug";
export { buildCompanyContext } from "./utils/company-context";
export {
  compareIds,
  isValidId,
  normalizeId,
  type SafeId,
  safeId,
} from "./utils/id-utils";
export {
  companyContextSchema,
  isValidEmail,
  isValidUuid,
  isValidWorkspaceId,
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
  WEBHOOK_SECRET_BYTES,
  WEBHOOK_SECRET_MIN_LENGTH,
} from "./webhook";
