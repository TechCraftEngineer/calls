/**
 * Helper функции для работы с speaker diarization
 */

import { env, SPEAKER_CONFIG } from "@calls/config";
import { z } from "zod";
import { createLogger } from "../../../logger";

const logger = createLogger("speaker-diarization");

/**
 * Проверяет доступен ли callback режим (настроен INNGEST_EVENT_KEY в speaker-embeddings сервисе)
 */
export function isCallbackModeAvailable(): boolean {
  // Проверяем есть ли INNGEST_EVENT_KEY в конфигурации
  // Это означает что speaker-embeddings сервис может отправлять callback события
  return !!env.INNGEST_EVENT_KEY;
}

// Zod схемы для валидации ответов
const DiarizationSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  speaker: z.string(),
});

const DiarizationResponseSchema = z.object({
  success: z.boolean(),
  segments: z.array(DiarizationSegmentSchema).optional().default([]),
  num_speakers: z.number().optional().default(0),
  speakers: z.array(z.string()).optional().default([]),
});

const HealthCheckResponseSchema = z.object({
  pyannote_available: z.boolean().optional(),
});

export interface DiarizationSegment {
  start: number;
  end: number;
  speaker: string;
}

export interface DiarizationResult {
  success: boolean;
  segments: DiarizationSegment[];
  num_speakers: number;
  speakers: string[];
}

/**
 * Выполняет диаризацию аудио через speaker-embeddings сервис
 */
export async function performDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
  options: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  } = {},
): Promise<DiarizationResult> {
  const speakerEmbeddingsUrl = env.SPEAKER_EMBEDDINGS_URL;

  if (!speakerEmbeddingsUrl) {
    logger.warn("SPEAKER_EMBEDDINGS_URL не настроен, диаризация пропущена");
    return {
      success: false,
      segments: [],
      num_speakers: 0,
      speakers: [],
    };
  }

  try {
    // Подготавливаем FormData для отправки
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/wav" });

    formData.append("file", blob, filename);

    if (options.numSpeakers !== undefined) {
      formData.append("num_speakers", options.numSpeakers.toString());
    }
    if (options.minSpeakers !== undefined) {
      formData.append("min_speakers", options.minSpeakers.toString());
    }
    if (options.maxSpeakers !== undefined) {
      formData.append("max_speakers", options.maxSpeakers.toString());
    }

    logger.info("Запрос диаризации к speaker-embeddings", {
      filename,
      options,
    });

    const response = await fetch(`${speakerEmbeddingsUrl}/api/diarize`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(SPEAKER_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Speaker-embeddings API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Zod валидация ответа
    let validatedResult: z.infer<typeof DiarizationResponseSchema>;
    try {
      validatedResult = DiarizationResponseSchema.parse(result);
    } catch (validationError) {
      logger.error("Ошибка валидации ответа диаризации", {
        filename,
        error: validationError instanceof Error ? validationError.message : String(validationError),
        response: result,
      });
      return {
        success: false,
        segments: [],
        num_speakers: 0,
        speakers: [],
      };
    }

    logger.info("Диаризация завершена", {
      segmentsCount: validatedResult.segments.length,
      numSpeakers: validatedResult.num_speakers,
      speakers: validatedResult.speakers,
    });

    return {
      success: validatedResult.success,
      segments: validatedResult.segments,
      num_speakers: validatedResult.num_speakers,
      speakers: validatedResult.speakers,
    };
  } catch (error) {
    logger.error("Ошибка диаризации", {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      segments: [],
      num_speakers: 0,
      speakers: [],
    };
  }
}

/**
 * Проверяет доступность speaker-embeddings сервиса
 */
export async function checkSpeakerEmbeddingsHealth(): Promise<boolean> {
  const speakerEmbeddingsUrl = env.SPEAKER_EMBEDDINGS_URL;

  if (!speakerEmbeddingsUrl) {
    return false;
  }

  try {
    const response = await fetch(`${speakerEmbeddingsUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(SPEAKER_CONFIG.HEALTH_TIMEOUT_MS),
    });

    if (response.ok) {
      const data = await response.json();
      try {
        const validatedData = HealthCheckResponseSchema.parse(data);
        return validatedData.pyannote_available || false;
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    logger.warn("Ошибка проверки здоровья speaker-embeddings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Запускает асинхронную диаризацию аудио через speaker-embeddings сервис.
 * Возвращает task_id для отслеживания статуса.
 */
export async function startAsyncDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
  options: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  } = {},
): Promise<{ taskId: string }> {
  const speakerEmbeddingsUrl = env.SPEAKER_EMBEDDINGS_URL;

  if (!speakerEmbeddingsUrl) {
    throw new Error("SPEAKER_EMBEDDINGS_URL не настроен");
  }

  // Подготавливаем FormData для отправки
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  formData.append("file", blob, filename);

  if (options.numSpeakers !== undefined) {
    formData.append("num_speakers", options.numSpeakers.toString());
  }
  if (options.minSpeakers !== undefined) {
    formData.append("min_speakers", options.minSpeakers.toString());
  }
  if (options.maxSpeakers !== undefined) {
    formData.append("max_speakers", options.maxSpeakers.toString());
  }

  logger.info("Запуск асинхронной диаризации", {
    filename,
    options,
    endpoint: `${speakerEmbeddingsUrl}/api/diarize-async`,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SPEAKER_CONFIG.ASYNC_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${speakerEmbeddingsUrl}/api/diarize-async`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status !== 202) {
      throw new Error(
        `Speaker-embeddings async API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    if (!result.task_id) {
      throw new Error("Speaker-embeddings async API не вернул task_id");
    }

    logger.info("Асинхронная диаризация запущена", {
      filename,
      taskId: result.task_id,
    });

    return { taskId: result.task_id };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Проверяет статус асинхронной задачи диаризации.
 */
export async function checkDiarizationStatus(
  taskId: string,
): Promise<{ status: string; result?: DiarizationResult; error?: string }> {
  const speakerEmbeddingsUrl = env.SPEAKER_EMBEDDINGS_URL;

  if (!speakerEmbeddingsUrl) {
    throw new Error("SPEAKER_EMBEDDINGS_URL не настроен");
  }

  const response = await fetch(`${speakerEmbeddingsUrl}/api/status/${taskId}`, {
    method: "GET",
    signal: AbortSignal.timeout(10_000), // 10 секунд на статус
  });

  if (!response.ok) {
    throw new Error(
      `Speaker-embeddings status API error: ${response.status} ${response.statusText}`,
    );
  }

  const result = await response.json();

  logger.info("Статус асинхронной диаризации", {
    taskId,
    status: result.status,
  });

  // Если результат готов, валидируем его
  if (result.status === "completed" && result.result) {
    try {
      const validatedResult = DiarizationResponseSchema.parse(result.result);
      return {
        status: result.status,
        result: {
          success: validatedResult.success,
          segments: validatedResult.segments,
          num_speakers: validatedResult.num_speakers,
          speakers: validatedResult.speakers,
        },
      };
    } catch (validationError) {
      logger.error("Ошибка валидации результата асинхронной диаризации", {
        taskId,
        error: validationError instanceof Error ? validationError.message : String(validationError),
        response: result.result,
      });
      return {
        status: "failed",
        error: "Ошибка валидации результата",
      };
    }
  }

  return result;
}

/**
 * Ожидает завершения асинхронной диаризации через polling.
 * Используется как fallback когда callback режим недоступен.
 */
export async function waitForAsyncDiarization(taskId: string): Promise<DiarizationResult> {
  const POLL_INTERVAL_MS = 30_000; // 30 секунд
  const MAX_POLL_ATTEMPTS = 60; // Максимум 30 минут (60 * 30 сек)

  logger.info("Начало polling статуса асинхронной диаризации", {
    taskId,
    pollInterval: POLL_INTERVAL_MS,
    maxAttempts: MAX_POLL_ATTEMPTS,
    mode: "polling",
  });

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    let status: Awaited<ReturnType<typeof checkDiarizationStatus>>;
    try {
      status = await checkDiarizationStatus(taskId);
    } catch (error) {
      logger.error("Ошибка при проверке статуса асинхронной диаризации", {
        taskId,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      // Если это не последняя попытка - пробуем еще раз
      if (attempt < MAX_POLL_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      throw error;
    }

    // Проверка статуса вне try/catch - fatal ошибки не вызывают retry
    if (status.status === "completed" && status.result) {
      logger.info("Асинхронная диаризация завершена", {
        taskId,
        attempt,
        segmentsCount: status.result.segments.length,
        mode: "polling",
      });
      return status.result;
    }

    if (status.status === "failed") {
      throw new Error(
        `Асинхронная диаризация завершилась с ошибкой: ${status.error || "Неизвестная ошибка"}`,
      );
    }

    // Все еще pending или processing - продолжаем polling
    logger.info("Ожидание завершения асинхронной диаризации", {
      taskId,
      attempt,
      status: status.status,
    });

    if (attempt < MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error(
    `Таймаут ожидания асинхронной диаризации (taskId: ${taskId}, попыток: ${MAX_POLL_ATTEMPTS})`,
  );
}

/**
 * Обертка для автоматического выбора режима диаризации.
 * Если SPEAKER_EMBEDDINGS_ASYNC_MODE=true - использует асинхронный режим с callback.
 * Иначе - использует синхронный режим.
 */
export async function performDiarizationAuto(
  audioBuffer: ArrayBuffer,
  filename: string,
  options: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  } = {},
): Promise<DiarizationResult> {
  if (env.SPEAKER_EMBEDDINGS_ASYNC_MODE) {
    logger.info("Используется асинхронный режим speaker-embeddings (callback)", { filename });

    // Запускаем асинхронную задачу
    const { taskId } = await startAsyncDiarization(audioBuffer, filename, options);

    // Проверяем доступен ли callback режим
    const callbackAvailable = isCallbackModeAvailable();

    if (callbackAvailable) {
      logger.info("Callback режим доступен, Python сервис отправит результат в Inngest", {
        taskId,
      });
      // В callback режиме Python сервис сам отправит событие в Inngest
      // Здесь мы не можем ждать результат - это требует изменения архитектуры
      // Для сейчас используем polling как fallback
      const result = await waitForAsyncDiarization(taskId);
      return result;
    } else {
      logger.info("Callback режим недоступен, используем polling", { taskId });
      const result = await waitForAsyncDiarization(taskId);
      return result;
    }
  } else {
    logger.info("Используется синхронный режим speaker-embeddings", { filename });
    return performDiarization(audioBuffer, filename, options);
  }
}
