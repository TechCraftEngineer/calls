/**
 * Типы для ASR (Automatic Speech Recognition) pipeline
 */

/** Источник ASR; legacy-значения встречаются в старых метаданных транскриптов */
export type AsrSource = "assemblyai" | "yandex" | "gigaam" | "merged";

export interface Utterance {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
  embedding?: number[];
  confidence?: number;
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
  provider: "assemblyai" | "yandex" | "gigaam"; // assemblyai/yandex — только в старых записях
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
  /** Длительность аудио в секундах (URL / Giga AM) */
  durationInSeconds?: number;
  /** Legacy: AssemblyAI */
  asrAssemblyai?: AsrProviderMeta;
  /** Legacy: Yandex SpeechKit */
  asrYandex?: AsrProviderMeta;
  /** Полный текст и метрики от Giga AM */
  asrGigaAm?: AsrProviderMeta;
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
