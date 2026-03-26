/**
 * Giga AM ASR через HTTP API (например Hugging Face Space).
 */

import { env } from "@calls/config";
import { z } from "zod";
import type { AsrResult, Utterance } from "~/asr/types";
import { NonRetryableError, withRetry } from "~/asr/utils/retry";
import { createLogger } from "~/logger";

const logger = createLogger("asr-gigaam");

const FETCH_TIMEOUT_MS = 30_000;
const GIGA_AM_HTTP_TIMEOUT_MS = 120_000;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

const gigaAmSegmentSchema = z.object({
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
  start_formatted: z.string().optional(),
  end_formatted: z.string().optional(),
  duration: z.number().optional(),
});

const gigaAmSuccessResponseSchema = z.object({
  success: z.literal(true),
  segments: z.array(gigaAmSegmentSchema),
  total_duration: z.number().optional(),
});

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function abortable<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function guessAudioFilename(audioUrl: string, contentType: string): string {
  try {
    const u = new URL(audioUrl);
    const base = u.pathname.split("/").pop();
    if (base && /\.(mp3|wav|flac|m4a|aac|ogg|webm)$/i.test(base)) {
      return decodeURIComponent(base);
    }
  } catch {
    /* ignore */
  }
  const ct = contentType.toLowerCase();
  if (ct.includes("mpeg") || ct.includes("mp3")) return "audio.mp3";
  if (ct.includes("wav")) return "audio.wav";
  if (ct.includes("flac")) return "audio.flac";
  if (ct.includes("mp4") || ct.includes("m4a")) return "audio.m4a";
  if (ct.includes("ogg")) return "audio.ogg";
  if (ct.includes("webm")) return "audio.webm";
  return "audio.wav";
}

/**
 * Таймер сбрасывается только после полного завершения `consume` (включая чтение тела ответа).
 */
async function fetchWithTimeout<T>(
  input: string,
  init: RequestInit,
  timeoutMessage: string,
  timeoutMs: number,
  consume: (response: Response, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const { signal } = controller;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, {
      ...init,
      signal,
    });
    return await consume(response, signal);
  } catch (error) {
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError");
    if (aborted) {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readAudioWithLimit(
  response: Response,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES) {
    throw new Error(
      `Размер аудио превышает лимит: ${contentLength} > ${MAX_AUDIO_BYTES}`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return await (signal
      ? abortable(signal, response.arrayBuffer())
      : response.arrayBuffer());
  }

  let total = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_AUDIO_BYTES) {
      await reader.cancel();
      throw new Error(`Размер аудио превышает лимит ${MAX_AUDIO_BYTES} байт`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

function segmentsToText(
  segments: z.infer<typeof gigaAmSegmentSchema>[],
): string {
  return segments
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function segmentsToUtterances(
  segments: z.infer<typeof gigaAmSegmentSchema>[],
): Utterance[] {
  return segments.map((s, i) => ({
    speaker: `Сегмент ${i + 1}`,
    text: s.text.trim(),
    start: s.start,
    end: s.end,
  }));
}

export function isGigaAmTranscribeConfigured(): boolean {
  return env.GIGA_AM_ENABLED && Boolean(env.GIGA_AM_TRANSCRIBE_URL?.trim());
}

export async function transcribeWithGigaAm(
  audioUrl: string,
): Promise<AsrResult | null> {
  if (!isGigaAmTranscribeConfigured()) {
    logger.info("Giga AM отключён или URL не задан, пропускаем");
    return null;
  }

  const transcribeUrl = env.GIGA_AM_TRANSCRIBE_URL?.trim();
  if (!transcribeUrl) {
    return null;
  }
  const start = Date.now();

  return withRetry(
    async () => {
      const { buffer: audioBuffer, contentType } = await fetchWithTimeout(
        audioUrl,
        {},
        "TIMEOUT_AUDIO_DOWNLOAD: Превышено время ожидания скачивания аудио",
        FETCH_TIMEOUT_MS,
        async (audioResponse, signal) => {
          if (!audioResponse.ok) {
            const msg = `Не удалось скачать аудио: ${audioResponse.status} ${audioResponse.statusText}`;
            if (audioResponse.status < 500) {
              throw new NonRetryableError(msg);
            }
            throw new Error(msg);
          }

          const ct =
            audioResponse.headers.get("content-type") ??
            "application/octet-stream";
          const buffer = await readAudioWithLimit(audioResponse, signal);
          return { buffer, contentType: ct };
        },
      );

      const filename = guessAudioFilename(audioUrl, contentType);

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([audioBuffer], { type: contentType }),
        filename,
      );

      const apiResponse = await fetchWithTimeout(
        transcribeUrl,
        {
          method: "POST",
          body: formData,
        },
        "TIMEOUT_GIGA_AM: Превышено время ожидания ответа Giga AM",
        GIGA_AM_HTTP_TIMEOUT_MS,
        async (response, signal) => {
          const rawJson: unknown = await abortable(
            signal,
            response.json().catch(() => null),
          );

          if (!response.ok) {
            const detail =
              rawJson &&
              typeof rawJson === "object" &&
              "detail" in rawJson &&
              typeof (rawJson as { detail?: unknown }).detail === "string"
                ? (rawJson as { detail: string }).detail
                : response.statusText;
            const msg = `Giga AM HTTP ${response.status}: ${detail}`;
            if (response.status < 500) {
              throw new NonRetryableError(msg);
            }
            throw new Error(msg);
          }

          const parsed = gigaAmSuccessResponseSchema.safeParse(rawJson);
          if (!parsed.success) {
            logger.warn("Некорректный формат ответа Giga AM", {
              issues: parsed.error.issues.map((i) => i.message),
            });
            throw new NonRetryableError("Giga AM: некорректный JSON ответа");
          }

          return parsed.data;
        },
      );

      const data = apiResponse;
      const text = segmentsToText(data.segments);
      const utterances = segmentsToUtterances(data.segments);
      const processingTimeMs = Date.now() - start;

      logger.info("Giga AM распознавание завершено", {
        processingTimeMs,
        textLength: text.length,
        segmentCount: data.segments.length,
      });

      return {
        source: "gigaam",
        text,
        utterances: utterances.length > 0 ? utterances : undefined,
        processingTimeMs,
        raw: {
          endpoint: transcribeUrl,
          totalDuration: data.total_duration,
          segmentCount: data.segments.length,
        },
      };
    },
    {
      maxAttempts: 3,
      baseDelayMs: 2500,
      onRetry: (attempt, error) =>
        logger.warn("Повторная попытка Giga AM ASR", {
          attempt,
          error: toErrorMessage(error),
        }),
    },
  );
}
