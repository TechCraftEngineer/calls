/**
 * HTTP клиент для GigaAM API с retry логикой
 */

import { env } from "@calls/config";
import { z } from "zod";
import { createLogger } from "../../../../logger";
import { GigaAmResponseSchema } from "../schemas";
import type { AsrResult } from "../types";

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

export async function processAudioWithGigaAm(
  audioBuffer: ArrayBuffer,
  filename: string,
  /** @deprecated Параметр сохранен для обратной совместимости, но не используется - функция всегда возвращает non-diarized результат */
  diarization: boolean,
): Promise<AsrResult> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  // Используем реальное имя файла или fallback на "audio.wav"
  const audioFilename = filename?.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);
  formData.append("diarization", diarization.toString());

  const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-sync`, () => ({
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(env.GIGA_AM_TIMEOUT_MS),
  }));

  if (!response.ok) {
    throw new Error(`Ошибка GigaAM API: ${response.status} ${response.statusText}`);
  }

  const rawResult = await response.json();

  // Zod валидация перед доступом к полям
  const gigaValidation = GigaAmResponseSchema.safeParse(rawResult);
  if (!gigaValidation.success) {
    const errorDetails = gigaValidation.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
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
  const result = await processAudioWithGigaAm(audioBuffer, filename, false);
  return result;
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
    signal: AbortSignal.timeout(env.GIGA_AM_TIMEOUT_MS),
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
