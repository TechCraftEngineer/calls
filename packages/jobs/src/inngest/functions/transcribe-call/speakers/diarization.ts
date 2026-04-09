/**
 * Диаризация через Speaker Embeddings Service
 */

import { env, SPEAKER_CONFIG } from "@calls/config";
import type { GigaAmSegment } from "~/inngest/functions/transcribe-call/types";
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
 * Запускает диаризацию через speaker embeddings сервис
 */
export async function startSpeakerDiarization(
  callId: string,
  segments: GigaAmSegment[]
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

    // Отправляем только необходимые данные (без эмбеддингов для уменьшения размера)
    const payload = {
      callId,
      segments: segments.map((s) => ({
        speaker: s.speaker,
        start: s.start,
        end: s.end,
        text: s.text,
        // Эмбеддинги будут пересчитаны на стороне сервиса для консистентности
      })),
    };

    const response = await fetch(`${SPEAKER_EMBEDDINGS_URL}/diarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      taskId: data.taskId,
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
 * Проверяет статус диаризации
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
      `${SPEAKER_EMBEDDINGS_URL}/diarize/${taskId}`,
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
 * Результат диаризации для performDiarization
 */
export interface PerformDiarizationResult {
  success: boolean;
  segments: Array<{
    start: number;
    end: number;
    speaker: string;
  }>;
  num_speakers?: number;
  speakers?: string[];
}

/**
 * Выполняет диаризацию аудио в асинхронном режиме
 * Запускает диаризацию и ожидает результат через polling
 */
export async function performDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
  callId: string,
  maxWaitMs = 120000,
  pollIntervalMs = 2000
): Promise<PerformDiarizationResult> {
  const startTime = Date.now();
  
  logger.info("Запуск асинхронной диаризации", { callId, filename });
  
  try {
    // Проверяем health сервиса
    const isHealthy = await checkSpeakerEmbeddingsHealth();
    if (!isHealthy) {
      logger.warn("Speaker embeddings сервис недоступен", { callId });
      return {
        success: false,
        segments: [],
      };
    }
    
    // Отправляем аудио на диаризацию
    // Создаем временные сегменты для запуска
    const tempSegments = [{
      speaker: "SPEAKER_00",
      start: 0,
      end: 0,
      text: "",
    }];
    
    const { success, taskId, error } = await startSpeakerDiarization(callId, tempSegments);
    
    if (!success || !taskId) {
      logger.error("Не удалось запустить диаризацию", { callId, error });
      return {
        success: false,
        segments: [],
      };
    }
    
    logger.info("Диаризация запущена, ожидание результата", { callId, taskId });
    
    // Polling для получения результата
    while (Date.now() - startTime < maxWaitMs) {
      const status = await getDiarizationStatus(taskId);
      
      if (status.status === "completed" && status.result) {
        logger.info("Диаризация завершена", { callId, taskId, durationMs: Date.now() - startTime });
        
        // Преобразуем результат в формат PerformDiarizationResult
        // Здесь нужно получить сегменты из другого источника или адаптировать логику
        return {
          success: true,
          segments: [], // TODO: получить реальные сегменты
          num_speakers: status.result.clusterCount,
        };
      }
      
      if (status.status === "failed") {
        logger.error("Диаризация завершилась с ошибкой", { callId, taskId, error: status.error });
        return {
          success: false,
          segments: [],
        };
      }
      
      // Ждем перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    // Таймаут
    logger.error("Таймаут ожидания диаризации", { callId, taskId, maxWaitMs });
    return {
      success: false,
      segments: [],
    };
    
  } catch (error) {
    logger.error("Ошибка при выполнении диаризации", {
      callId,
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      segments: [],
    };
  }
}

/**
 * Выполняет автоматическую диаризацию (адаптер для совместимости)
 * @deprecated Используйте processAudioWithDiarization из gigaam/diarization
 */
export async function performDiarizationAuto(
  audioBuffer: ArrayBuffer,
  filename: string
): Promise<PerformDiarizationResult> {
  logger.warn("performDiarizationAuto is deprecated, use processAudioWithDiarization from gigaam/diarization");
  
  // Делегируем к gigaam модулю если доступен
  try {
    const { processAudioWithDiarization } = await import("~/inngest/functions/transcribe-call/gigaam/diarization");
    const result = await processAudioWithDiarization(audioBuffer, filename);
    
    return {
      success: true,
      segments: result.segments.map(s => ({
        start: s.start,
        end: s.end,
        speaker: s.speaker,
      })),
    };
  } catch (error) {
    logger.error("performDiarizationAuto failed", { filename, error });
    return {
      success: false,
      segments: [],
    };
  }
}
