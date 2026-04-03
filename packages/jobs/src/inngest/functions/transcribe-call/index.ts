/**
 * Индексный файл для модуля транскрибации
 */

export * from "./helpers";
export * from "./llm-correction";
export * from "./main";
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

export type {
  Call,
  PipelineAudioResult,
  SpeakerIdentificationResult,
  TranscriptionResult,
  Workspace,
} from "./types";
export * from "./validation";

// Экспорт downloadAudioBuffer для внешнего использования
export { downloadAudioBuffer } from "./helpers";
