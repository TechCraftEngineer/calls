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

// ============ GigaAM ============
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
export { gigaAmCompletedFn } from "./gigaam/callback-handler";
export { processAudioWithDiarization } from "./gigaam/diarization";

// ============ LLM ============
export {
  isAnsweringMachineWithLlm,
  type AnsweringMachineResult,
} from "./llm";
export {
  applyLLMCorrection,
  buildCorrectionPrompt,
  correctTranscriptionWithLLM,
  type TranscriptionSegment,
  validateAndMergeCorrections,
} from "./llm/correction";
export {
  applyLLMMerging,
  buildMergingPrompt,
  estimateTokenCount,
  MAX_PROMPT_TOKENS,
  mergeAsrResultsWithLLM,
  type AsrDiarizedResult,
  type AsrNonDiarizedResult,
  type AsrSegment,
} from "./llm/merge";

// ============ Manager ============
export { resolveManagerFromPbx } from "./manager";

// ============ Speakers ============
export {
  checkSpeakerEmbeddingsHealth,
  getDiarizationStatus,
  shouldUseSpeakerEmbeddings,
  startSpeakerDiarization,
  type SpeakerDiarizationResult,
} from "./speakers";
export {
  createSpeakerEmbeddingsCompletedEvent,
  handleSpeakerEmbeddingsCallback,
  validateSpeakerEmbeddingsCallback,
  type SpeakerEmbeddingsCallbackData,
} from "./speakers/embeddings-handler";
export {
  identifySpeakers,
  type IdentifySpeakersResult,
} from "./speakers/identification";

// ============ Utils ============
export {
  extractSegmentsFromUtterances,
  extractSpeakerTimeline,
} from "./utils";
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
export { serializeMetadata } from "./utils/metadata";
export {
  quickAnsweringMachineCheck,
  shouldRunQuickCheck,
  type QuickCheckResult,
} from "./utils/quick-am-check";

// ============ Main Function ============
export { transcribeCallFn } from "./main";

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
