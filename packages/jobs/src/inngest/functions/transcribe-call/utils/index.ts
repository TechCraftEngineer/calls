/**
 * Утилиты для транскрибации
 */

export {
  extractSegmentsFromUtterances,
  extractSpeakerTimeline,
} from "./extraction";

export { serializeMetadata } from "./metadata";

export {
  createSafeResponse,
  handleAsyncError,
  TranscriptionError,
  type ValidationError,
  validateCall,
  validateCallId,
  validateFile,
  validatePipelineResult,
  validateTranscriptionResult,
  validateWorkspace,
} from "./validation";

export {
  quickAnsweringMachineCheck,
  shouldRunQuickCheck,
  type QuickCheckResult,
} from "./quick-am-check";
