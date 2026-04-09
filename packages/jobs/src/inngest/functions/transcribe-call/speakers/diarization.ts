/**
 * Диаризация через Speaker Embeddings Service (Асинхронная модель)
 * 
 * Использует POST /diarize-async для запуска задачи.
 * Результат приходит через Inngest callback (speaker-embeddings/diarization.completed).
 * Polling на /status НЕ используется.
 */

import { env, SPEAKER_CONFIG } from "@calls/config";
import { createLogger } from "~/logger";

const logger = createLogger("speaker-diarization");

// Конфигурация таймаутов из env
const SPEAKER_EMBEDDINGS_TIMEOUT_MS = SPEAKER_CONFIG.TIMEOUT_MS || 30000;
const SPEAKER_EMBEDDINGS_HEALTH_TIMEOUT_MS = SPEAKER_CONFIG.HEALTH_TIMEOUT_MS || 5000;

// URL сервиса speaker embeddings
const SPEAKER_EMBEDDINGS_URL =
  env.SPEAKER_EMBEDDINGS_URL || "http://speaker-embeddings:8000";

/**
 * Результат диаризации через speaker embeddings
 */
export interface SpeakerDiarizationResult {
  success: boolean;
  mapping?: Record<string, string>;
  usedEmbeddings?: boolean;
  clusterCount?: number;
  reason?: string;
  truncatedForAnalysis?: boolean;
  fallbackReason?: string;
  fallbackAttempted?: boolean;
  errorCode?: string;
  error?: string;
}

/**
 * Проверяет health speaker embeddings сервиса
 */
export async function checkSpeakerEmbeddingsHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SPEAKER_EMBEDDINGS_HEALTH_TIMEOUT_MS
    );

    const response = await fetch(`${SPEAKER_EMBEDDINGS_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    logger.warn("Speaker embeddings health check failed", {
      error: error instanceof Error ? error.message : String(error),
      url: SPEAKER_EMBEDDINGS_URL,
    });
    return false;
  }
}

/**
 * Запускает асинхронную диаризацию через speaker embeddings сервис.
 * Отправляет аудио файл и callId, получает taskId.
 * Результат будет отправлен через Inngest callback.
 */
export async function startSpeakerDiarization(
  callId: string,
  audioBuffer: ArrayBuffer,
  filename: string,
  options?: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  }
): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SPEAKER_EMBEDDINGS_TIMEOUT_MS
    );

    // Создаем FormData для отправки аудио файла
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    const audioFilename = filename?.trim() ? filename : "audio.wav";
    
    formData.append("file", blob, audioFilename);
    formData.append("call_id", callId);
    
    if (options?.numSpeakers !== undefined) {
      formData.append("num_speakers", options.numSpeakers.toString());
    }
    if (options?.minSpeakers !== undefined) {
      formData.append("min_speakers", options.minSpeakers.toString());
    }
    if (options?.maxSpeakers !== undefined) {
      formData.append("max_speakers", options.maxSpeakers.toString());
    }

    logger.info("Запуск асинхронной диаризации", {
      callId,
      filename: audioFilename,
      endpoint: `${SPEAKER_EMBEDDINGS_URL}/diarize-async`,
    });

    const response = await fetch(`${SPEAKER_EMBEDDINGS_URL}/diarize-async`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status !== 202) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    
    logger.info("Асинхронная диаризация запущена", {
      callId,
      taskId: data.task_id,
    });
    
    return {
      success: true,
      taskId: data.task_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to start speaker diarization", {
      callId,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Проверяет статус диаризации через /status endpoint
 */
export async function getDiarizationStatus(
  taskId: string
): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  result?: SpeakerDiarizationResult;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SPEAKER_EMBEDDINGS_HEALTH_TIMEOUT_MS
    );

    const response = await fetch(
      `${SPEAKER_EMBEDDINGS_URL}/status/${taskId}`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: "failed",
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      status: data.status,
      result: data.result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to get diarization status", {
      taskId,
      error: errorMessage,
    });
    return {
      status: "failed",
      error: errorMessage,
    };
  }
}

/**
 * Определяет, стоит ли использовать speaker embeddings
 * на основе длительности и количества сегментов
 */
export function shouldUseSpeakerEmbeddings(
  durationSeconds: number,
  segmentCount: number
): boolean {
  // Используем только для звонков длительностью более 30 секунд
  // и с более чем 2 сегментами (чтобы было что диаризировать)
  const MIN_DURATION_SECONDS = 30;
  const MIN_SEGMENTS = 2;

  return (
    durationSeconds >= MIN_DURATION_SECONDS && segmentCount >= MIN_SEGMENTS
  );
}

/**
 * Результат запуска диаризации (асинхронная модель)
 */
export interface PerformDiarizationResult {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * Запускает асинхронную диаризацию аудио.
 * Возвращает taskId сразу, результат придет через Inngest callback.
 * Polling НЕ используется.
 */
export async function performDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
  callId: string,
  options?: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  }
): Promise<PerformDiarizationResult> {
  logger.info("Запуск асинхронной диаризации", { callId, filename });

  try {
    // Запускаем асинхронную диаризацию
    const result = await startSpeakerDiarization(callId, audioBuffer, filename, options);

    if (!result.success || !result.taskId) {
      logger.error("Не удалось запустить диаризацию", { callId, error: result.error });
      return {
        success: false,
        error: result.error || "Failed to start diarization",
      };
    }

    logger.info("Диаризация запущена, ожидаем callback", {
      callId,
      taskId: result.taskId,
    });

    // Возвращаем taskId - результат придет через Inngest
    return {
      success: true,
      taskId: result.taskId,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Ошибка при запуске диаризации", {
      callId,
      filename,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}
