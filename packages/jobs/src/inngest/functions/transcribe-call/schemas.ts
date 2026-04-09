/**
 * Zod схемы для валидации данных транскрибации
 */

import { z } from "zod";

// Схема для валидации входных данных Inngest события
export const TranscribeCallEventSchema = z.object({
  callId: z.string().min(1, "callId не может быть пустым"),
});

// Схема для валидации данных звонка
export const CallSchema = z.object({
  id: z.string().min(1, "ID звонка не может быть пустым"),
  workspaceId: z.string().min(1, "workspaceId не может быть пустым"),
  fileId: z.string().min(1, "fileId не может быть пустым"),
  internalNumber: z.string().nullable().optional(),
  direction: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
});

// Схема для валидации workspace
export const WorkspaceSchema = z.object({
  id: z.string().min(1, "ID workspace не может быть пустым"),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// Схема для валидации файла
export const FileSchema = z.object({
  id: z.string().min(1, "ID файла не может быть пустым"),
  storageKey: z.string().min(1, "storageKey не может быть пустым"),
  filename: z.string().nullable().optional(),
});

// Схема для валидации результата pipeline аудио
export const PipelineAudioResultSchema = z.object({
  preprocessedFileId: z.string().min(1, "preprocessedFileId не может быть пустым"),
  durationSeconds: z.number().nullable().optional(),
});

// Схема для валидации сегмента транскрипции
export const TranscriptionSegmentSchema = z.object({
  speaker: z.string().optional(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  confidence: z.number().optional(),
  embedding: z.array(z.number()).optional(),
});

// Схема для валидации ответа GigaAM
export const GigaAmResponseSchema = z.object({
  segments: z.array(TranscriptionSegmentSchema).optional(),
  final_transcript: z.string().optional(),
  speakerTimeline: z
    .array(
      z.object({
        speaker: z.string(),
        start: z.number(),
        end: z.number(),
        text: z.string(),
        overlap: z.boolean().optional(),
      }),
    )
    .optional(),
});

// Схема для валидации ASR логов
export const AsrLogSchema = z.object({
  provider: z.string(),
  success: z.boolean(),
  utterances: z.array(TranscriptionSegmentSchema).optional(),
  raw: z.unknown().optional(),
});

// Схема для валидации метаданных ASR
export const AsrMetadataSchema = z.object({
  asrLogs: z.array(AsrLogSchema).default([]),
  confidence: z.number().optional(),
  processingTimeMs: z.number().optional(),
  asrSource: z.string().optional(),
});

// Схема для валидации результата транскрипции
export const TranscriptionResultSchema = z.object({
  segments: z.array(TranscriptionSegmentSchema),
  transcript: z.string(),
  metadata: AsrMetadataSchema,
  normalizedText: z.string().optional(),
  rawText: z.string().optional(),
  summary: z.string().nullable().optional(),
  sentiment: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  callType: z.string().nullable().optional(),
  callTopic: z.string().nullable().optional(),
});

// Схема для валидации результата идентификации спикеров
export const SpeakerIdentificationResultSchema = z.object({
  text: z.string(),
  customerName: z.string().optional(),
  operatorName: z.string().optional(),
  metadata: z
    .object({
      success: z.boolean().optional(),
      mapping: z.record(z.string(), z.string()).optional(),
      usedEmbeddings: z.boolean().optional(),
      clusterCount: z.number().optional(),
      reason: z.string().optional(),
      truncatedForAnalysis: z.boolean().optional(),
      fallbackReason: z.string().optional(),
      fallbackAttempted: z.boolean().optional(),
      errorCode: z.string().optional(),
      error: z.string().optional(),
    })
    .optional(),
});

// Схема для валидации метаданных для сохранения
export const TranscriptMetadataSchema = z
  .object({
    operatorName: z.string().optional(),
    diarization: z
      .object({
        success: z.boolean().optional(),
        mapping: z.record(z.string(), z.string()).optional(),
        usedEmbeddings: z.boolean().optional(),
        clusterCount: z.number().optional(),
        reason: z.string().optional(),
        truncatedForAnalysis: z.boolean().optional(),
        fallbackReason: z.string().optional(),
        fallbackAttempted: z.boolean().optional(),
        errorCode: z.string().optional(),
        error: z.string().optional(),
      })
      .optional(),
  })
  .passthrough(); // Разрешаем дополнительные поля из ASR

// Типы для использования в коде
export type TranscribeCallEvent = z.infer<typeof TranscribeCallEventSchema>;
export type Call = z.infer<typeof CallSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type File = z.infer<typeof FileSchema>;
export type PipelineAudioResult = z.infer<typeof PipelineAudioResultSchema>;
export type TranscriptionSegment = z.infer<typeof TranscriptionSegmentSchema>;
export type GigaAmResponse = z.infer<typeof GigaAmResponseSchema>;
export type AsrLog = z.infer<typeof AsrLogSchema>;
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
export type SpeakerIdentificationResult = z.infer<typeof SpeakerIdentificationResultSchema>;
export type TranscriptMetadata = z.infer<typeof TranscriptMetadataSchema>;
