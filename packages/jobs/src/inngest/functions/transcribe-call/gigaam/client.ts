/**
 * HTTP клиент для GigaAM API с retry логикой
 */

import { env, GIGA_AM_CONFIG } from "@calls/config";
import { z } from "zod";
import { createLogger } from "~/logger";
import { GigaAmResponseSchema } from "~/inngest/functions/transcribe-call/schemas";
import type { AsrResult } from "~/inngest/functions/transcribe-call/types";

const logger = createLogger("gigaam-client");

export async function fetchWithRetry(
  url: string,
  buildOptions: () => RequestInit,
  retries = 3,
  baseDelayMs = 1000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const options = buildOptions();
      const response = await fetch(url, options);
      if (response.ok || attempt === retries) return response;
      // retry on 5xx only
      if (response.status < 500) return response;
      logger.warn(
        `GigaAM transient error, retrying (attempt: ${attempt}, status: ${response.status}, url: ${url})`,
      );
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`GigaAM network error, retrying (attempt: ${attempt}, err: ${err}, url: ${url})`);
    }

    // Добавляем jitter для предотвращения thundering-herd
    const delay = baseDelayMs * 2 ** attempt;
    const jitteredDelay = delay * (0.5 + Math.random());
    await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
  }
  throw new Error("fetchWithRetry: unreachable");
}

/**
 * Синхронная транскрибация аудио через GigaAM API.
 * Используется для быстрой первичной транскрибации без диаризации.
 */
export async function processAudioWithGigaAm(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<AsrResult> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  // Используем реальное имя файла или fallback на "audio.wav"
  const audioFilename = filename?.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);
  formData.append("diarization", "false");

  const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-sync`, () => ({
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(GIGA_AM_CONFIG.TIMEOUT_MS),
  }));

  if (!response.ok) {
    throw new Error(`Ошибка GigaAM API: ${response.status} ${response.statusText}`);
  }

  const rawResult = await response.json();

  // Zod валидация перед доступом к полям
  const gigaValidation = GigaAmResponseSchema.safeParse(rawResult);
  if (!gigaValidation.success) {
    const errorDetails = gigaValidation.error.issues
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    logger.warn("Ошибка валидации ответа GigaAM", {
      filename,
      errorDetails,
      response: rawResult,
    });

    // Создаем безопасный fallback объект
    return {
      segments: [],
      transcript: "",
      validationFailed: true,
      validationError: `Ошибка валидации ответа GigaAM: ${errorDetails}`,
      metadata: {
        asrLogs: [
          {
            provider: "gigaam-non-diarized",
            utterances: [],
            raw: rawResult,
          },
        ],
      },
    };
  }

  const gigaResult = gigaValidation.data;

  // Проверяем наличие транскрипции
  if (!gigaResult.final_transcript) {
    logger.warn("GigaAM API не вернул текст транскрипции", {
      filename,
      response: gigaResult,
    });
    throw new Error("GigaAM API не вернул текст транскрипции");
  }

  return {
    segments: [],
    transcript: gigaResult.final_transcript || "",
    validationFailed: false,
    metadata: {
      asrLogs: [
        {
          provider: "gigaam-non-diarized",
          utterances: [],
          raw: rawResult,
        },
      ],
    },
  };
}

export async function processAudioWithoutDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<AsrResult> {
  const { taskId } = await startAsyncTranscription(audioBuffer, filename);
  return await waitForAsyncResult(taskId);
}

// Zod схема для валидации DiarizedTranscriptionResult
const DiarizedTranscriptionSegmentSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  speaker: z.string().optional(),
  confidence: z.number(),
});

const SpeakerTimelineItemSchema = z.object({
  speaker: z.string(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
});

const DiarizedTranscriptionResultSchema = z.object({
  success: z.boolean(),
  final_transcript: z.string(),
  segments: z.array(DiarizedTranscriptionSegmentSchema),
  speakerTimeline: z.array(SpeakerTimelineItemSchema),
  speaker_timeline: z.array(SpeakerTimelineItemSchema).optional(),
  num_speakers: z.number(),
  speakers: z.array(z.string()),
  processing_time: z.number(),
  pipeline: z.string(),
  error: z.string().optional(),
});

/**
 * Схема статуса асинхронной задачи
 */
const AsyncTaskStatusSchema = z.object({
  task_id: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  result: z.any().optional(),
  error: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Интерфейс сегмента диаризации
 */
export interface DiarizationSegmentInput {
  start: number;
  end: number;
  speaker: string;
}

/**
 * Результат транскрипции диаризированного аудио
 */
export interface DiarizedTranscriptionResult {
  success: boolean;
  final_transcript: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
    confidence: number;
  }>;
  speakerTimeline: Array<{
    speaker: string;
    start: number;
    end: number;
    text: string;
  }>;
  /** @deprecated Используйте speakerTimeline (camelCase) */
  speaker_timeline?: Array<{
    speaker: string;
    start: number;
    end: number;
    text: string;
  }>;
  num_speakers: number;
  speakers: string[];
  processing_time: number;
  pipeline: string;
  error?: string;
}

/**
 * Запускает асинхронную транскрипцию аудио через GigaAM API.
 * Возвращает task_id для отслеживания статуса.
 */
export async function startAsyncTranscription(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<{ taskId: string }> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  const audioFilename = filename?.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);

  logger.info("Запуск асинхронной транскрипции", {
    filename: audioFilename,
    endpoint: `${gigaAmUrl}/api/transcribe-async`,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GIGA_AM_CONFIG.ASYNC_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-async`, () => ({
      method: "POST",
      body: formData,
      signal: controller.signal,
    }));

    clearTimeout(timeoutId);

    if (response.status !== 202) {
      throw new Error(`GigaAM async API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.task_id) {
      throw new Error("GigaAM async API не вернул task_id");
    }

    logger.info("Асинхронная транскрипция запущена", {
      filename: audioFilename,
      taskId: result.task_id,
    });

    return { taskId: result.task_id };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Запускает асинхронную диаризированную транскрипцию аудио через GigaAM API.
 * Возвращает task_id для отслеживания статуса.
 */
export async function startAsyncDiarizedTranscription(
  audioBuffer: ArrayBuffer,
  filename: string,
  segments: DiarizationSegmentInput[],
): Promise<{ taskId: string }> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  const audioFilename = filename?.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);
  formData.append("segments", JSON.stringify(segments));

  logger.info("Запуск асинхронной диаризированной транскрипции", {
    filename: audioFilename,
    segmentsCount: segments.length,
    endpoint: `${gigaAmUrl}/api/transcribe-diarized-async`,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GIGA_AM_CONFIG.ASYNC_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-diarized-async`, () => ({
      method: "POST",
      body: formData,
      signal: controller.signal,
    }));

    clearTimeout(timeoutId);

    if (response.status !== 202) {
      throw new Error(`GigaAM async diarized API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.task_id) {
      throw new Error("GigaAM async diarized API не вернул task_id");
    }

    logger.info("Асинхронная диаризированная транскрипция запущена", {
      filename: audioFilename,
      taskId: result.task_id,
    });

    return { taskId: result.task_id };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Проверяет статус асинхронной задачи транскрипции.
 */
export async function checkAsyncTaskStatus(
  taskId: string,
): Promise<{ status: "pending" | "processing" | "completed" | "failed"; error?: string }> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;

  const response = await fetchWithRetry(`${gigaAmUrl}/api/tasks/${taskId}`, () => ({
    method: "GET",
  }));

  if (!response.ok) {
    throw new Error(`Ошибка проверки статуса задачи: ${response.status} ${response.statusText}`);
  }

  const rawResult = await response.json();

  const validation = AsyncTaskStatusSchema.safeParse(rawResult);
  if (!validation.success) {
    logger.warn("Ошибка валидации статуса задачи", {
      taskId,
      error: validation.error,
      response: rawResult,
    });
    throw new Error(`Ошибка валидации статуса задачи: ${validation.error.message}`);
  }

  const result = validation.data;

  if (result.status === "failed") {
    return { status: "failed", error: result.error || "Неизвестная ошибка" };
  }

  return { status: result.status };
}

/**
 * Получает результат асинхронной транскрипции по taskId.
 */
export async function getAsyncResult(taskId: string): Promise<AsrResult> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;

  const response = await fetchWithRetry(`${gigaAmUrl}/api/tasks/${taskId}/result`, () => ({
    method: "GET",
  }));

  if (!response.ok) {
    throw new Error(`Ошибка получения результата: ${response.status} ${response.statusText}`);
  }

  const rawResult = await response.json();

  // Zod валидация
  const gigaValidation = GigaAmResponseSchema.safeParse(rawResult);
  if (!gigaValidation.success) {
    const errorDetails = gigaValidation.error.issues
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    logger.warn("Ошибка валидации ответа GigaAM", {
      taskId,
      errorDetails,
      response: rawResult,
    });

    return {
      segments: [],
      transcript: "",
      validationFailed: true,
      validationError: `Ошибка валидации ответа GigaAM: ${errorDetails}`,
      metadata: {
        asrLogs: [
          {
            provider: "gigaam-non-diarized",
            utterances: [],
            raw: rawResult,
          },
        ],
      },
    };
  }

  const gigaResult = gigaValidation.data;

  if (!gigaResult.final_transcript) {
    logger.warn("GigaAM API не вернул текст транскрипции", {
      taskId,
      response: gigaResult,
    });
    throw new Error("GigaAM API не вернул текст транскрипции");
  }

  return {
    segments: [],
    transcript: gigaResult.final_transcript || "",
    validationFailed: false,
    metadata: {
      asrLogs: [
        {
          provider: "gigaam-non-diarized",
          utterances: [],
          raw: rawResult,
        },
      ],
    },
  };
}

/**
 * Получает результат асинхронной диаризированной транскрипции по taskId.
 */
export async function getAsyncDiarizedResult(taskId: string): Promise<DiarizedTranscriptionResult> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;

  const response = await fetchWithRetry(`${gigaAmUrl}/api/tasks/${taskId}/result`, () => ({
    method: "GET",
  }));

  if (!response.ok) {
    throw new Error(`Ошибка получения результата: ${response.status} ${response.statusText}`);
  }

  const rawResult = await response.json();

  const validation = DiarizedTranscriptionResultSchema.safeParse(rawResult);
  if (!validation.success) {
    logger.error("Ошибка валидации диаризированного результата", {
      taskId,
      error: validation.error,
    });
    throw new Error(`Ошибка валидации результата: ${validation.error.message}`);
  }

  const result = validation.data;

  if (!result.success) {
    throw new Error(`Ошибка диаризированной транскрипции: ${result.error || "Неизвестная ошибка"}`);
  }

  return result;
}

/**
 * Ожидает завершения асинхронной транскрипции с polling.
 */
export async function waitForAsyncResult(
  taskId: string,
  options?: { pollIntervalMs?: number; maxAttempts?: number },
): Promise<AsrResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 450; // 15 минут при 2 секундах

  logger.info("Начало ожидания результата асинхронной транскрипции", {
    taskId,
    pollIntervalMs,
    maxAttempts,
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkAsyncTaskStatus(taskId);

    if (status.status === "completed") {
      logger.info("Асинхронная транскрипция завершена", { taskId, attempt });
      return await getAsyncResult(taskId);
    }

    if (status.status === "failed") {
      logger.error("Асинхронная транскрипция завершилась с ошибкой", {
        taskId,
        attempt,
        error: status.error,
      });
      throw new Error(`Асинхронная транскрипция завершилась с ошибкой: ${status.error}`);
    }

    // Log каждые 30 попыток (1 минута)
    if (attempt % 30 === 0) {
      logger.info("Ожидание асинхронной транскрипции", {
        taskId,
        attempt,
        status: status.status,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Таймаут ожидания результата асинхронной транскрипции (taskId: ${taskId})`);
}

/**
 * Ожидает завершения асинхронной диаризированной транскрипции с polling.
 */
export async function waitForAsyncDiarizedResult(
  taskId: string,
  options?: { pollIntervalMs?: number; maxAttempts?: number },
): Promise<DiarizedTranscriptionResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 450; // 15 минут при 2 секундах

  logger.info("Начало ожидания результата асинхронной диаризированной транскрипции", {
    taskId,
    pollIntervalMs,
    maxAttempts,
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkAsyncTaskStatus(taskId);

    if (status.status === "completed") {
      logger.info("Асинхронная диаризированная транскрипция завершена", { taskId, attempt });
      return await getAsyncDiarizedResult(taskId);
    }

    if (status.status === "failed") {
      logger.error("Асинхронная диаризированная транскрипция завершилась с ошибкой", {
        taskId,
        attempt,
        error: status.error,
      });
      throw new Error(`Асинхронная диаризированная транскрипция завершилась с ошибкой: ${status.error}`);
    }

    // Log каждые 30 попыток (1 минута)
    if (attempt % 30 === 0) {
      logger.info("Ожидание асинхронной диаризированной транскрипции", {
        taskId,
        attempt,
        status: status.status,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Таймаут ожидания результата асинхронной диаризированной транскрипции (taskId: ${taskId})`);
}


/**
 * @deprecated Используйте startAsyncDiarizedTranscription + waitForAsyncDiarizedResult для асинхронной модели
 * Транскрибирует диаризированное аудио через GigaAM API.
 * Использует единый endpoint вместо N+1 HTTP-запросов.
 */
export async function processDiarizedAudioWithGigaAm(
  audioBuffer: ArrayBuffer,
  filename: string,
  segments: DiarizationSegmentInput[],
): Promise<DiarizedTranscriptionResult> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  const audioFilename = filename?.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);
  formData.append("segments", JSON.stringify(segments));

  logger.info("Отправка диаризированного аудио на транскрипцию", {
    filename: audioFilename,
    segmentsCount: segments.length,
    endpoint: `${gigaAmUrl}/api/transcribe-diarized`,
  });

  const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-diarized`, () => ({
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(GIGA_AM_CONFIG.TIMEOUT_MS),
  }));

  if (!response.ok) {
    throw new Error(`GigaAM diarized API error: ${response.status} ${response.statusText}`);
  }

  const result: DiarizedTranscriptionResult = await response.json();

  // Zod валидация результата
  const validationResult = DiarizedTranscriptionResultSchema.safeParse(result);
  if (!validationResult.success) {
    logger.error("Ошибка валидации ответа диаризированной транскрипции", {
      filename: audioFilename,
      error: validationResult.error,
    });
    throw new Error(`Ошибка валидации ответа: ${validationResult.error.message}`);
  }

  const validatedResult = validationResult.data;

  if (!validatedResult.success) {
    throw new Error(
      `Ошибка диаризированной транскрипции GigaAM: ${validatedResult.error || "Неизвестная ошибка"}`,
    );
  }

  logger.info("Диаризированная транскрипция завершена", {
    filename: audioFilename,
    segmentsCount: validatedResult.segments.length,
    processingTime: validatedResult.processing_time,
  });

  return validatedResult;
}



/**
 * Запускает асинхронную транскрипцию аудио через GigaAM API в callback режиме.
 * Возвращает task_id, результат будет отправлен через Inngest событие.
 */
export async function startAsyncTranscriptionCallback(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<{ taskId: string }> {
  logger.info("Запуск асинхронной транскрипции в callback режиме", { filename });
  return startAsyncTranscription(audioBuffer, filename);
}

/**
 * Запускает асинхронную диаризированную транскрипцию аудио через GigaAM API в callback режиме.
 * Возвращает task_id, результат будет отправлен через Inngest событие.
 */
export async function startAsyncDiarizedTranscriptionCallback(
  audioBuffer: ArrayBuffer,
  filename: string,
  segments: DiarizationSegmentInput[],
): Promise<{ taskId: string }> {
  logger.info("Запуск асинхронной диаризированной транскрипции в callback режиме", {
    filename,
    segmentsCount: segments.length,
  });
  return startAsyncDiarizedTranscription(audioBuffer, filename, segments);
}
