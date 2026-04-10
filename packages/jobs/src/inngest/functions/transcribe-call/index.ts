/**
 * Индексный файл для модуля транскрибации
 * Организован по принципу разделения ответственности:
 * - audio/ - работа с аудио
 * - flows/ - специальные флоу (автоответчик, отсутствие речи)
 * - gigaam/ - интеграция с GigaAM API
 * - llm/ - LLM операции (коррекция, слияние)
 * - manager/ - работа с менеджерами
 * - speakers/ - идентификация и диаризация спикеров
 * - steps/ - шаги pipeline транскрибации
 * - utils/ - утилиты и вспомогательные функции
 */

// ============ Audio ============
export { downloadAudioBuffer, downloadAudioFile } from "./audio/download";
export { extractAudioSegment } from "./audio/processing";
export { gigaAmCompletedFn } from "./gigaam/callback-handler";
// ============ GigaAM ============
export {
  checkAsyncTaskStatus,
  fetchWithRetry,
  getAsyncDiarizedResult,
  getAsyncResult,
  processAudioWithGigaAm,
  processAudioWithoutDiarization,
  startAsyncDiarizedTranscription,
  startAsyncTranscription,
  waitForAsyncDiarizedResult,
  waitForAsyncResult,
} from "./gigaam/client";
export { processAudioWithDiarization } from "./gigaam/diarization";

// ============ LLM ============
export {
  type AnsweringMachineResult,
  isAnsweringMachineWithLlm,
} from "./llm";
export {
  applyLLMCorrection,
  buildCorrectionPrompt,
  correctTranscriptionWithLLM,
  type TranscriptionSegment,
  validateAndMergeCorrections,
} from "./llm/correction";
export {
  type AsrDiarizedResult,
  type AsrNonDiarizedResult,
  type AsrSegment,
  applyLLMMerging,
  buildMergingPrompt,
  estimateTokenCount,
  MAX_PROMPT_TOKENS,
  mergeAsrResultsWithLLM,
} from "./llm/merge";
// ============ Main Function ============
export { transcribeCallFn } from "./main";
// ============ Manager ============
export { resolveManagerFromPbx } from "./manager";
// ============ Schemas (типы и схемы валидации) ============
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
// ============ Speakers ============
export {
  checkSpeakerEmbeddingsHealth,
  getDiarizationStatus,
  type PerformDiarizationResult,
  performDiarization,
  type SpeakerDiarizationResult,
  shouldUseSpeakerEmbeddings,
  startSpeakerDiarization,
} from "./speakers";
export {
  createSpeakerEmbeddingsCompletedEvent,
  handleSpeakerEmbeddingsCallback,
  type SpeakerEmbeddingsCallbackData,
  speakerEmbeddingsCompletedFn,
  validateSpeakerEmbeddingsCallback,
} from "./speakers/embeddings-handler";
export {
  type IdentifySpeakersResult,
  identifySpeakers,
} from "./speakers/identification";
// ============ Types ============
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
// ============ Utils ============
export {
  extractSegmentsFromUtterances,
  extractSpeakerTimeline,
} from "./utils";
export { serializeMetadata } from "./utils/metadata";
export {
  type QuickCheckResult,
  quickAnsweringMachineCheck,
  shouldRunQuickCheck,
} from "./utils/quick-am-check";
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
} from "./utils/validation";
