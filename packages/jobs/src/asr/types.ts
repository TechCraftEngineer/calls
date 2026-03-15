/**
 * Типы для ASR (Automatic Speech Recognition) pipeline
 */

export type AsrSource = "assemblyai" | "yandex" | "merged";

export interface Utterance {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
}

export interface AsrResult {
  source: AsrSource;
  text: string;
  utterances?: Utterance[];
  confidence?: number;
  processingTimeMs: number;
  raw?: Record<string, unknown>;
}

export interface TranscriptMetadata {
  asrSource: AsrSource;
  processingTimeMs: number;
  confidence?: number;
  speakerCount?: number;
  /** Длительность аудио в секундах (из AssemblyAI) */
  durationInSeconds?: number;
  asrAssemblyai?: Record<string, unknown>;
  asrYandex?: Record<string, unknown>;
}

export interface PipelineResult {
  rawText: string;
  normalizedText: string;
  metadata: TranscriptMetadata;
  summary?: string;
  sentiment?: string;
  title?: string;
  callTopic?: string;
}
