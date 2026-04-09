/**
 * Индексный файл для модуля транскрибации
 */

// Прямые экспорты из модулей (без helpers.ts barrel-экспорта)
export { downloadAudioBuffer, downloadAudioFile } from "./audio/download";
export { extractAudioSegment } from "./audio/processing";
export { extractSegmentsFromUtterances, extractSpeakerTimeline } from "./extraction";
export { gigaAmCompletedFn } from "./gigaam/callback-handler";
export { speakerEmbeddingsCompletedFn } from "./speaker-embeddings-callback-handler";
export {
  checkAsyncTaskStatus,
  fetchWithRetry,
  getAsyncResult,
  getAsyncDiarizedResult,
  processAudioWithGigaAm,
  processAudioWithoutDiarization,
  startAsyncDiarizedTranscription,
  startAsyncTranscription,
  waitForAsyncDiarizedResult,
  waitForAsyncResult,
} from "./gigaam/client";
export { processAudioWithDiarization } from "./gigaam/diarization";
export {
  applyLLMCorrection,
  buildCorrectionPrompt,
  correctTranscriptionWithLLM,
  type TranscriptionSegment,
  validateAndMergeCorrections,
} from "./llm-correction";
export {
  type AsrDiarizedResult,
  type AsrNonDiarizedResult,
  type AsrSegment,
  applyLLMMerging,
  buildMergingPrompt,
  estimateTokenCount,
  MAX_PROMPT_TOKENS,
  mergeAsrResultsWithLLM,
} from "./llm-merge";
export { transcribeCallFn } from "./main";
export { resolveManagerFromPbx } from "./manager-resolution";
export { serializeMetadata } from "./metadata";
export {
  type QuickCheckResult,
  quickAnsweringMachineCheck,
  shouldRunQuickCheck,
} from "./quick-am-check";
// Экспорт типов и схем с разрешением конфликтов
export type {
  AsrLog as AsrLogType,
  Call as CallType,
  File as FileType,
  GigaAmResponse,
  PipelineAudioResult as PipelineAudioResultType,
  SpeakerIdentificationResult as SpeakerIdentificationResultType,
  TranscriptionResult as TranscriptionResultType,
  TranscriptionSegment as TranscriptionSegmentType,
  TranscriptMetadata,
  Workspace as WorkspaceType,
} from "./schemas";
// Экспорт схем валидации
export {
  AsrLogSchema,
  AsrMetadataSchema,
  CallSchema,
  FileSchema,
  GigaAmResponseSchema,
  PipelineAudioResultSchema,
  SpeakerIdentificationResultSchema,
  TranscribeCallEventSchema,
  TranscriptionResultSchema,
  TranscriptionSegmentSchema,
  TranscriptMetadataSchema,
  WorkspaceSchema,
} from "./schemas";
export { identifySpeakers } from "./speaker-identification";
// Экспорт типов
export type {
  AsrResult,
  AudioBufferLegacyResult,
  AudioFileResult,
  Call,
  PipelineAudioResult,
  SpeakerIdentificationResult,
  TranscriptionResult,
  Workspace,
} from "./types";
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
