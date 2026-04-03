/**
 * HTTP клиент для GigaAM API с retry логикой
 */

import { env } from "@calls/config";
import { createLogger } from "../../../../logger";
import { GigaAmResponseSchema } from "../schemas";
import type { AsrResult } from "../types";
import type { z } from "zod";

const logger = createLogger("gigaam-client");

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelayMs = 1000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
  diarization: boolean,
): Promise<AsrResult> {
  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });

  // Используем реальное имя файла или fallback на "audio.wav"
  const audioFilename = filename && filename.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);
  formData.append("diarization", diarization.toString());

  const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-sync`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(env.GIGA_AM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GigaAM API error: ${response.status} ${response.statusText}`);
  }

  const gigaResult = await response.json();

  // Валидация ответа в зависимости от режима
  if (diarization) {
    if (!gigaResult.segments || !Array.isArray(gigaResult.segments)) {
      logger.warn("GigaAM API не вернул сегменты с диаризацией", {
        filename,
        response: gigaResult,
      });
      throw new Error("GigaAM API не поддерживает диаризацию в текущей конфигурации");
    }
  } else {
    if (!gigaResult.final_transcript && !gigaResult.text) {
      logger.warn("GigaAM API не вернул текст транскрипции", {
        filename,
        response: gigaResult,
      });
      throw new Error("GigaAM API не вернул текст транскрипции");
    }
  }

  const gigaValidation = GigaAmResponseSchema.safeParse(gigaResult);
  if (!gigaValidation.success) {
    const errorDetails = gigaValidation.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    logger.warn("GigaAM response validation failed", {
      filename,
      errorDetails,
      response: gigaResult,
    });

    // Создаем безопасный fallback объект вместо использования невалидированных данных
    const validatedGigaResult = {
      segments: diarization ? [] : undefined,
      final_transcript: "",
      text: "",
    };

    return {
      segments: diarization ? validatedGigaResult.segments || [] : [],
      transcript: validatedGigaResult.final_transcript || validatedGigaResult.text || "",
      validationFailed: true,
      validationError: `GigaAM response validation failed: ${errorDetails}`,
      metadata: {
        asrLogs: [
          {
            provider: diarization ? "gigaam-diarized" : "gigaam-non-diarized",
            utterances: diarization ? [] : [],
            raw: gigaResult,
          },
        ],
      },
    };
  }

  const validatedGigaResult = gigaValidation.data;

  return {
    segments: diarization ? validatedGigaResult.segments || [] : [],
    transcript: validatedGigaResult.final_transcript || "",
    validationFailed: false,
    metadata: {
      asrLogs: [
        {
          provider: diarization ? "gigaam-diarized" : "gigaam-non-diarized",
          utterances: diarization ? gigaResult.segments || [] : [],
          raw: gigaResult,
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
  return {
    ...result,
    segments: [], // Явно указываем пустые сегменты для non-diarized
  };
}
