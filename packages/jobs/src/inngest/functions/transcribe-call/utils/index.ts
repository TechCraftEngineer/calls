/**
 * Утилиты для транскрибации
 */

export {
  extractSegmentsFromUtterances,
  extractSpeakerTimeline,
} from "./extraction";

export { serializeMetadata } from "./metadata";
export {
  type QuickCheckResult,
  quickAnsweringMachineCheck,
  shouldRunQuickCheck,
} from "./quick-am-check";
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
