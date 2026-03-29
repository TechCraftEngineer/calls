/**
 * Шаги пайплайна транскрибации, вызываемые из Inngest (оркестрация сервисов).
 */

import { callsService, filesService } from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import { preprocessAudioWithPython } from "~/asr/audio/audio-enhancer-client";
import type { PreprocessingResult } from "~/asr/audio/audio-preprocessing";
import { getAudioDurationFromBuffer } from "~/asr/audio/get-audio-duration";
import { validatePcm16WavBuffer } from "~/asr/audio/validate-pcm16-wav";
import { createLogger } from "~/logger";

const logger = createLogger("transcribe-pipeline-audio");

const DEFAULT_AUDIO_DOWNLOAD_TIMEOUT_MS = 120_000;

async function fetchAudioBuffer(
  audioUrl: string,
  timeoutMs: number,
): Promise<Buffer> {
  const response = await fetch(audioUrl, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Не удалось скачать аудио: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Снимок без Buffer — сериализуется между шагами Inngest */
export type PipelinePreprocessSnapshot = Pick<
  PreprocessingResult,
  "audioUrl" | "wasProcessed" | "appliedFilters" | "processingTimeMs"
>;

export type PipelinePreprocessOutcome = {
  /** Файл для ASR (после /preprocess или оригинал при сбое) */
  preprocessedFileId: string;
  /** Метаданные audio-enhancer (overlap_candidates и т.д.) для giga-am */
  preprocessMetadata: Record<string, unknown> | null;
  /** Для логов и runTranscriptionPipelineFromAsrAudio (без Buffer) */
  preprocessingResult: PipelinePreprocessSnapshot;
};

/**
 * Скачивает оригинал, вызывает audio-enhancer `/preprocess`, сохраняет WAV в S3.
 * При недоступности enhancer возвращает оригинальный fileId и null metadata.
 */
export async function runPipelineAudioPreprocess(params: {
  callId: string;
  workspaceId: string;
  originalFileId: string;
  originalStorageKey: string;
}): Promise<PipelinePreprocessOutcome> {
  const start = Date.now();
  const originalUrl = await getDownloadUrlForAsr(params.originalStorageKey);
  try {
    const headRes = await fetch(originalUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(4_000),
    });
    if (!headRes.ok) {
      logger.warn("Pre-signed URL недоступен (HEAD)", {
        callId: params.callId,
        status: headRes.status,
      });
    }
  } catch (error) {
    logger.warn("Pre-signed URL HEAD check failed", {
      callId: params.callId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const originalBuffer = await fetchAudioBuffer(
    originalUrl,
    DEFAULT_AUDIO_DOWNLOAD_TIMEOUT_MS,
  );

  const prep = await preprocessAudioWithPython(originalBuffer, {
    targetSampleRate: 16000,
  });

  if (!prep.wasProcessed || !prep.audioBuffer.length) {
    logger.warn(
      "audio-enhancer preprocess недоступен, ASR по оригинальному файлу",
      {
        callId: params.callId,
      },
    );
    const preprocessingResult: PipelinePreprocessSnapshot = {
      audioUrl: originalUrl,
      wasProcessed: false,
      appliedFilters: [],
      processingTimeMs: Date.now() - start,
    };
    return {
      preprocessedFileId: params.originalFileId,
      preprocessMetadata: null,
      preprocessingResult,
    };
  }

  const wavValidation = validatePcm16WavBuffer(prep.audioBuffer);
  if (!wavValidation.valid) {
    logger.error("preprocess вернул некорректный WAV", {
      callId: params.callId,
      reason: wavValidation.reason,
    });
    throw new Error(`Invalid preprocessed WAV: ${wavValidation.reason}`);
  }

  let durationSeconds: number | null = null;

  // Используем длительность из Python сервиса, если доступна (более точная)
  if (typeof prep.durationSeconds === "number" && prep.durationSeconds > 0) {
    durationSeconds = prep.durationSeconds;
  } else {
    // Fallback: рассчитываем через music-metadata
    try {
      const d = await getAudioDurationFromBuffer(prep.audioBuffer);
      if (typeof d === "number" && d > 0) durationSeconds = d;
    } catch {
      /* ignore */
    }
  }

  const uploaded = await filesService.uploadFile(params.workspaceId, {
    originalName: `preprocessed_${params.callId}.wav`,
    buffer: prep.audioBuffer,
    mimeType: "audio/wav",
    fileType: "call_recording",
    source: "asr-preprocessing",
    durationSeconds,
  });
  const preprocessedAudioUrl = await getDownloadUrlForAsr(uploaded.storageKey);

  try {
    await callsService.updateEnhancedAudio(params.callId, uploaded.id);
  } catch (error) {
    logger.warn("updateEnhancedAudio после preprocess не выполнен", {
      callId: params.callId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const preprocessingResult: PipelinePreprocessSnapshot = {
    audioUrl: preprocessedAudioUrl,
    wasProcessed: true,
    appliedFilters: ["audio-enhancer-preprocess"],
    processingTimeMs: Date.now() - start,
  };

  return {
    preprocessedFileId: uploaded.id,
    preprocessMetadata: prep.preprocessMetadata,
    preprocessingResult,
  };
}
