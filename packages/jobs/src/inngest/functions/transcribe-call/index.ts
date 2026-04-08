/**
 * Индексный файл для модуля транскрибации
 */

// Прямые экспорты из модулей (без helpers.ts barrel-экспорта)
export { downloadAudioFile, downloadAudioBuffer } from "./audio/download";
export { extractAudioSegment } from "./audio/processing";
export {
  processAudioWithGigaAm,
  processAudioWithoutDiarization,
  fetchWithRetry,
} from "./gigaam/client";
export { processAudioWithDiarization } from "./gigaam/diarization";
export { extractSpeakerTimeline, extractSegmentsFromUtterances } from "./extraction";
export { identifySpeakers } from "./speaker-identification";
export { resolveManagerFromPbx } from "./manager-resolution";
export { serializeMetadata } from "./metadata";
export {
  quickAnsweringMachineCheck,
  shouldRunQuickCheck,
  type QuickCheckResult,
} from "./quick-am-check";
export * from "./llm-correction";
export * from "./llm-merge";
export * from "./main";
export * from "./validation";

// Экспорт типов
export type {
  AsrResult,
  AudioFileResult,
  AudioBufferLegacyResult,
  Call,
  PipelineAudioResult,
  SpeakerIdentificationResult,
  TranscriptionResult,
  Workspace,
} from "./types";

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
