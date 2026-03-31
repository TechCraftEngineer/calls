/**
 * Giga AM ASR через HTTP API (например Hugging Face Space).
 */

import { env } from "@calls/config";
import { z } from "zod";
import type { AsrResult, Utterance } from "../types";
import { NonRetryableError, withRetry } from "../utils/retry";
import { createLogger } from "@calls/logger";

const logger = createLogger("asr-gigaam");

const FETCH_TIMEOUT_MS = 30_000;
const GIGA_AM_HTTP_TIMEOUT_MS = 120_000;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 403, 404]);

const gigaAmSegmentSchema = z.object({
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
  start_formatted: z.string().optional(),
  end_formatted: z.string().optional(),
  duration: z.number().optional(),
  speaker: z.string().optional(),
});

const gigaAmSpeakerTimelineEntrySchema = z.object({
  speaker: z.string(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  overlap: z.boolean().optional(),
});

const gigaAmSuccessResponseSchema = z.object({
  success: z.literal(true),
  segments: z.array(gigaAmSegmentSchema),
  total_duration: z.number().optional(),
  final_transcript: z.string().optional(),
  speaker_timeline: z.array(gigaAmSpeakerTimelineEntrySchema).optional(),
  pipeline: z.string().optional(),
  stages: z.array(z.string()).optional(),
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
    .map((s) => {
      const text = s.text.trim();
      if (!text) return "";

      const speaker =
        typeof s.speaker === "string" && s.speaker.trim()
          ? s.speaker.trim()
          : "Спикер";
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function speakerTimelineToText(
  timeline: z.infer<typeof gigaAmSpeakerTimelineEntrySchema>[],
): string {
  return timeline
    .map((entry) => {
      const text = entry.text.trim();
      if (!text) return "";

      const speaker = entry.speaker?.trim() || "Спикер";
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function segmentsToUtterances(
  segments: z.infer<typeof gigaAmSegmentSchema>[],
): Utterance[] {
  return segments.map((s, i) => ({
    speaker: typeof s.speaker === "string" ? s.speaker : `Сегмент ${i + 1}`,
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
  options?: {
    preprocessMetadata?: Record<string, unknown> | null;
    audioBuffer?: Buffer;
    audioBufferMime?: string;
  },
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
  let audioBuffer: Buffer;
  let contentType: string;
  
  if (options?.audioBuffer) {
    audioBuffer = options.audioBuffer;
    const detectedMime = "application/octet-stream"; // Could be enhanced with MIME detection in the future
    contentType = options.audioBufferMime ?? detectedMime;
  } else {
    const result = await withRetry(
      () =>
        fetchWithTimeout(
          audioUrl,
          {},
          "TIMEOUT_AUDIO_DOWNLOAD: Превышено время ожидания скачивания аудио",
          FETCH_TIMEOUT_MS,
          async (audioResponse, signal) => {
            if (!audioResponse.ok) {
              const msg = `Не удалось скачать аудио: ${audioResponse.status} ${audioResponse.statusText}`;
              if (NON_RETRYABLE_HTTP_STATUSES.has(audioResponse.status)) {
                throw new NonRetryableError(msg);
              }
              throw new Error(msg);
            }

            const ct =
              audioResponse.headers.get("content-type") ??
              "application/octet-stream";
            const arrayBuffer = await readAudioWithLimit(audioResponse, signal);
            return { buffer: Buffer.from(arrayBuffer), contentType: ct };
          },
        ),
      {
        maxAttempts: 3,
        baseDelayMs: 1500,
        onRetry: (attempt: number, error: unknown) =>
          logger.warn("Повторная попытка скачивания аудио Giga AM", {
            attempt,
            error: toErrorMessage(error),
          }),
      },
    );
    
    audioBuffer = result.buffer;
    contentType = result.contentType;
  }

  const filename = guessAudioFilename(audioUrl, contentType);

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: contentType }),
    filename,
  );
  if (
    options?.preprocessMetadata &&
    Object.keys(options.preprocessMetadata).length > 0
  ) {
    formData.append(
      "preprocess_metadata_json",
      JSON.stringify(options.preprocessMetadata),
    );
  }
  const apiResponse = await withRetry(
    () =>
      fetchWithTimeout(
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
            if (NON_RETRYABLE_HTTP_STATUSES.has(response.status)) {
              throw new NonRetryableError(msg);
            }
            throw new Error(msg);
          }

          const parsedSync = gigaAmSuccessResponseSchema.safeParse(rawJson);
          if (!parsedSync.success) {
            logger.warn("Некорректный формат sync-ответа Giga AM", {
              issues: parsedSync.error.issues.map((i) => i.message),
            });
            throw new NonRetryableError(
              "Giga AM: некорректный JSON sync-ответа",
            );
          }
          return parsedSync.data;
        },
      ),
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      onRetry: (attempt: number, error: unknown) =>
        logger.warn("Повторная попытка POST запроса в Giga AM", {
          attempt,
          error: toErrorMessage(error),
        }),
    },
  );

  const segments = apiResponse.segments;
  const speakerTimeline = apiResponse.speaker_timeline;
  const totalDuration = apiResponse.total_duration;
  const finalTranscript = apiResponse.final_transcript?.trim() ?? "";

  // Приоритет: speaker_timeline > final_transcript > segments
  const speakerText =
    speakerTimeline && speakerTimeline.length > 0
      ? speakerTimelineToText(speakerTimeline)
      : "";
  const text = speakerText || finalTranscript || segmentsToText(segments);

  const utterances = segmentsToUtterances(segments);
  const processingTimeMs = Date.now() - start;

  logger.info("Giga AM распознавание завершено", {
    processingTimeMs,
    textLength: text.length,
    segmentCount: segments.length,
  });

  return {
    source: "gigaam",
    text,
    utterances: utterances.length > 0 ? utterances : undefined,
    processingTimeMs,
    raw: {
      endpoint: transcribeUrl,
      totalDuration,
      segmentCount: segments.length,
      mode: "sync",
      ultraPipeline:
        apiResponse.pipeline === "ultra-sync-2026" ||
        Boolean(apiResponse.final_transcript),
      final_transcript: apiResponse.final_transcript,
      speakerTimelineCount: apiResponse.speaker_timeline?.length,
      pipelineStages: apiResponse.stages,
    },
  };
}
