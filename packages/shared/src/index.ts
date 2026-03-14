/**
 * Shared utilities and types
 */

export { generateWorkspaceSlug } from "./slug";
export {
  compareIds,
  isValidId,
  normalizeId,
  type SafeId,
  safeId,
} from "./utils/id-utils";
export {
  isValidEmail,
  isValidUuid,
  isValidWorkspaceId,
  workspaceIdSchema,
} from "./validation";
export {
  validateFtpCredentials,
  validateFtpHost,
  validateFtpPassword,
  validateFtpUser,
} from "./validation/ftp";
