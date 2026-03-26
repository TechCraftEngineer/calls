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
const GIGA_AM_JOB_TIMEOUT_MS = 20 * 60_000;
const GIGA_AM_JOB_POLL_INTERVAL_MS = 5000;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 403, 404]);

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

const gigaAmJobCreateResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
});

const gigaAmJobResultSchema = z.object({
  status: z.string(),
  result: z
    .object({
      segments: z.array(gigaAmSegmentSchema).optional(),
      final_transcript: z.string().optional(),
      total_duration: z.number().optional(),
    })
    .optional(),
  error: z.string().optional().nullable(),
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const { buffer: audioBuffer, contentType } = await withRetry(
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
          const buffer = await readAudioWithLimit(audioResponse, signal);
          return { buffer, contentType: ct };
        },
      ),
    {
      maxAttempts: 3,
      baseDelayMs: 1500,
      onRetry: (attempt, error) =>
        logger.warn("Повторная попытка скачивания аудио Giga AM", {
          attempt,
          error: toErrorMessage(error),
        }),
    },
  );

  const filename = guessAudioFilename(audioUrl, contentType);

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: contentType }),
    filename,
  );

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
          if (parsedSync.success) {
            return parsedSync.data;
          }
          const parsedJob = gigaAmJobCreateResponseSchema.safeParse(rawJson);
          if (parsedJob.success) {
            return parsedJob.data;
          }
          logger.warn("Некорректный формат ответа Giga AM", {
            syncIssues: parsedSync.success
              ? []
              : parsedSync.error.issues.map((i) => i.message),
            jobIssues: parsedJob.success
              ? []
              : parsedJob.error.issues.map((i) => i.message),
          });
          throw new NonRetryableError("Giga AM: некорректный JSON ответа");
        },
      ),
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      onRetry: (attempt, error) =>
        logger.warn("Повторная попытка POST запроса в Giga AM", {
          attempt,
          error: toErrorMessage(error),
        }),
    },
  );

  let segments: z.infer<typeof gigaAmSegmentSchema>[] = [];
  let totalDuration: number | undefined;
  let finalTranscript: string | undefined;

  if ("success" in apiResponse) {
    segments = apiResponse.segments;
    totalDuration = apiResponse.total_duration;
  } else {
    const baseUrl = transcribeUrl.replace(/\/$/, "");
    const isJobsEndpoint = /\/api\/jobs$/i.test(baseUrl);
    const jobStatusUrl = isJobsEndpoint
      ? `${baseUrl}/${apiResponse.job_id}`
      : `${baseUrl}/api/jobs/${apiResponse.job_id}`;

    const jobDeadline = Date.now() + GIGA_AM_JOB_TIMEOUT_MS;
    let jobCompleted = false;
    await withRetry(
      async () => {
        while (Date.now() < jobDeadline) {
          const jobStatusRaw = await fetchWithTimeout(
            jobStatusUrl,
            { method: "GET" },
            "TIMEOUT_GIGA_AM_JOB: Превышено время ожидания завершения Giga AM job",
            GIGA_AM_HTTP_TIMEOUT_MS,
            async (response, signal) => {
              const raw: unknown = await abortable(
                signal,
                response.json().catch(() => null),
              );
              if (!response.ok) {
                const msg = `Giga AM job HTTP ${response.status}: ${response.statusText}`;
                if (response.status < 500) {
                  throw new NonRetryableError(msg);
                }
                throw new Error(msg);
              }
              const parsed = gigaAmJobResultSchema.safeParse(raw);
              if (!parsed.success) {
                throw new NonRetryableError(
                  "Giga AM job: некорректный JSON ответа",
                );
              }
              return parsed.data;
            },
          );

          const status = (jobStatusRaw.status || "").toLowerCase();
          if (status === "done") {
            segments = jobStatusRaw.result?.segments ?? [];
            totalDuration = jobStatusRaw.result?.total_duration;
            finalTranscript = jobStatusRaw.result?.final_transcript;
            jobCompleted = true;
            break;
          }
          if (status === "failed" || status === "cancelled") {
            const detail =
              jobStatusRaw.error ||
              `Giga AM job завершился со статусом ${status}`;
            throw new NonRetryableError(
              `Giga AM job ${apiResponse.job_id} terminal status=${status}: ${detail}`,
            );
          }
          await sleep(GIGA_AM_JOB_POLL_INTERVAL_MS);
        }
        if (!jobCompleted) {
          throw new Error("TIMEOUT_GIGA_AM_JOB: Не дождались завершения job");
        }
      },
      {
        maxAttempts: 3,
        baseDelayMs: 2500,
        onRetry: (attempt, error) =>
          logger.warn("Повторная попытка Giga AM job polling", {
            attempt,
            error: toErrorMessage(error),
          }),
      },
    );
  }

  const text = finalTranscript?.trim() || segmentsToText(segments);
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
      mode: "success" in apiResponse ? "sync" : "async-job",
    },
  };
}
