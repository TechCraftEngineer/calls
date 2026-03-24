/**
 * Типы для ASR (Automatic Speech Recognition) pipeline
 */

export type AsrSource = "assemblyai" | "yandex" | "huggingface" | "merged";

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

export interface AsrProviderMeta {
  text?: string;
  confidence?: number;
  hasUtterances?: boolean;
  processingTimeMs?: number;
}

export interface AsrExecutionLog {
  provider: "assemblyai" | "yandex" | "huggingface";
  success: boolean;
  processingTimeMs?: number;
  text?: string;
  confidence?: number;
  utterances?: Utterance[];
  raw?: Record<string, unknown>;
  error?: string;
}

export interface TranscriptMetadata {
  asrSource: AsrSource;
  processingTimeMs: number;
  confidence?: number;
  speakerCount?: number;
  /** Длительность аудио в секундах (из AssemblyAI) */
  durationInSeconds?: number;
  /** Полный текст и метрики от AssemblyAI */
  asrAssemblyai?: AsrProviderMeta;
  /** Полный текст и метрики от Yandex */
  asrYandex?: AsrProviderMeta;
  /** Полный текст и метрики от Hugging Face */
  asrHuggingFace?: AsrProviderMeta;
  /** Детальные логи каждого ASR провайдера (ответы/ошибки) */
  asrLogs?: AsrExecutionLog[];
  /** Логи шага диаризации/идентификации спикеров */
  diarization?: Record<string, unknown>;
}

export interface PipelineResult {
  rawText: string;
  normalizedText: string;
  metadata: TranscriptMetadata;
  summary?: string;
  sentiment?: string;
  title?: string;
  callType?: string;
  callTopic?: string;
  /** Улучшенное аудио (если была предобработка) */
  enhancedAudioBuffer?: Buffer;
  /** Имя файла улучшенного аудио */
  enhancedAudioFilename?: string;
}
