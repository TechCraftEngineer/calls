/**
 * Типы для транскрибации звонков
 */

import type { z } from "zod";
import type { TranscriptionSegmentSchema } from "./schemas";

export interface Call {
  id: string;
  workspaceId: string;
  fileId: string;
  internalNumber?: string | null;
  direction: string;
  name?: string | null;
}

export interface Workspace {
  id: string;
  name?: string | null;
  description?: string | null;
}

export interface PbxIntegration {
  enabled: boolean;
  config?: {
    provider?: string;
  } | null;
}

export interface PbxNumber {
  extension?: string | null;
  phoneNumber?: string | null;
  label?: string | null;
  isActive: boolean;
}

export interface GigaAmSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
  embedding?: number[] | null;
  confidence?: number | null;
}

export interface SpeakerTimelineItem {
  speaker: string;
  start: number;
  end: number;
  text: string;
  overlap?: boolean;
}

export interface GigaAmResult {
  segments?: GigaAmSegment[];
  final_transcript?: string;
  speakerTimeline?: SpeakerTimelineItem[];
  diarization?: {
    success?: boolean;
    mapping?: Record<string, string>;
    usedEmbeddings?: boolean;
    clusterCount?: number;
    reason?: string;
    truncatedForAnalysis?: boolean;
    fallbackReason?: string;
    fallbackAttempted?: boolean;
    errorCode?: string;
    error?: string;
  };
}

export interface AsrLog {
  provider: string;
  utterances?: GigaAmSegment[];
  raw?: GigaAmResult;
}

export interface TranscriptionResult {
  segments: GigaAmSegment[];
  transcript: string;
  metadata: {
    asrLogs: AsrLog[];
    confidence?: number;
    processingTimeMs?: number;
    asrSource?: string;
  };
  normalizedText?: string;
  rawText?: string;
  summary?: string;
  sentiment?: string;
  title?: string;
  callType?: string;
  callTopic?: string;
}

export interface SpeakerIdentificationResult {
  text: string;
  customerName?: string;
  operatorName?: string;
  metadata?: {
    success?: boolean;
    mapping?: Record<string, string>;
    usedEmbeddings?: boolean;
    clusterCount?: number;
    reason?: string;
    truncatedForAnalysis?: boolean;
    fallbackReason?: string;
    fallbackAttempted?: boolean;
    errorCode?: string;
    error?: string;
  };
}

export interface PipelineAudioResult {
  preprocessedFileId: string;
}

export interface AsrResult {
  segments: Array<{
    speaker: string;
    start: number;
    end: number;
    text: string;
    embedding?: number[] | null;
    confidence?: number;
  }>;
  transcript: string;
  validationFailed?: boolean;
  validationError?: string;
  metadata: {
    asrLogs: Array<{
      provider: string;
      utterances: z.infer<typeof TranscriptionSegmentSchema>[];
      raw: unknown;
    }>;
  };
}

export interface AudioFileResult {
  buffer: ArrayBuffer;
  filename: string;
}

export interface AudioBufferLegacyResult {
  buffer: string;
  filename: string;
}
