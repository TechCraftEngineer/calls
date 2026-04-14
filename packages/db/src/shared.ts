/**
 * Shared utilities that can be used in both client and server code
 * No database client dependencies
 */

// Processing status utilities
export {
  getNextProcessingStatus,
  isProcessing,
  isProcessingFinished,
  isValidProcessingStatus,
  normalizeProcessingStatus,
  PROCESSING_STATUS,
  PROCESSING_STATUS_CONFIG,
  type ProcessingStatus,
} from "./utils/call-processing-status";

// Call status utilities
export {
  CALL_STATUS,
  type CallStatus,
  normalizeCallStatus,
} from "./utils/call-status";

// Phone number utilities
export { normalizePhoneNumberList } from "./utils/normalize-phone-number-list";

// Workspace ID utilities
export { isValidWorkspaceId } from "./utils/workspace-id-generator";
