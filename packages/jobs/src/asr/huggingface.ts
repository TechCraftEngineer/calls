/**
 * Hugging Face ASR провайдер.
 * Базовый сценарий: Inference API для моделей типа audio-to-text.
 */

import { env } from "@calls/config";
import { InferenceClient } from "@huggingface/inference";
import { z } from "zod";
import { createLogger } from "../logger";
import { withRetry } from "./retry";
import type { AsrResult } from "./types";

const logger = createLogger("asr-huggingface");

const HF_INFERENCE_BASE = "https://api-inference.huggingface.co/models";
const HF_ROUTER_INFERENCE_BASE =
  "https://router.huggingface.co/hf-inference/models";
const DEFAULT_HF_ASR_MODEL = "ai-sage/GigaAM-v3";
const ADDITIONAL_DEFAULT_HF_ASR_MODELS = ["microsoft/VibeVoice-ASR"] as const;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const HF_INFERENCE_TIMEOUT_MS = 40_000;

const huggingFaceAsrArrayItemSchema = z.object({
  text: z.string().optional(),
});

const huggingFaceAsrObjectSchema = z.object({
  text: z.string().optional(),
  error: z.string().optional(),
  estimated_time: z.number().optional(),
});

const huggingFaceAsrResponseSchema = z.union([
  z.array(huggingFaceAsrArrayItemSchema),
  huggingFaceAsrObjectSchema,
]);

type HuggingFaceAsrResponse = z.infer<typeof huggingFaceAsrResponseSchema>;

interface RawModelPayload extends Record<string, unknown> {
  model: string;
  revision?: string;
  endpoint?: string;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("socket connection was closed unexpectedly") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("enotfound") ||
    message.includes("und_err_socket") ||
    message.includes("networkerror")
  );
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.response?.status === "number")
    return candidate.response.status;
  return undefined;
}

function buildModelEndpoint(
  base: string,
  modelPath: string,
  revision?: string,
): string {
  if (!revision) {
    return `${base}/${modelPath}`;
  }
  return `${base}/${modelPath}?revision=${encodeURIComponent(revision)}`;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readAudioWithLimit(response: Response): Promise<ArrayBuffer> {
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES) {
    throw new Error(
      `Размер аудио превышает лимит: ${contentLength} > ${MAX_AUDIO_BYTES}`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return response.arrayBuffer();
  }

  let total = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
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

function parseTranscript(data: HuggingFaceAsrResponse): string {
  if (Array.isArray(data)) {
    return data
      .map((item) => item.text ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return (data.text ?? "").trim();
}

async function withOperationTimeout<T>(
  operation: Promise<T>,
  timeoutMessage: string,
  timeoutMs: number,
): Promise<T> {
  return await Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ]);
}

export async function transcribeWithHuggingFace(
  audioUrl: string,
  modelOverride?: string,
): Promise<AsrResult | null> {
  const apiKey = env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    logger.warn("HUGGINGFACE_API_KEY не задан, пропускаем Hugging Face ASR");
    return null;
  }

  const model =
    modelOverride?.trim() || env.HUGGINGFACE_ASR_MODEL || DEFAULT_HF_ASR_MODEL;
  const revision = env.HUGGINGFACE_ASR_REVISION?.trim();
  const modelPath = encodeURIComponent(model).replace(/%2F/g, "/");
  const endpoints = [
    buildModelEndpoint(HF_INFERENCE_BASE, modelPath, revision),
    buildModelEndpoint(HF_ROUTER_INFERENCE_BASE, modelPath, revision),
  ];
  const inferenceClient = new InferenceClient(apiKey);
  const start = Date.now();

  return withRetry(
    async () => {
      const audioResponse = await fetchWithTimeout(
        audioUrl,
        {},
        "TIMEOUT_AUDIO_DOWNLOAD: Превышено время ожидания скачивания аудио",
      );
      if (!audioResponse.ok) {
        throw new Error(
          `Не удалось скачать аудио: ${audioResponse.status} ${audioResponse.statusText}`,
        );
      }

      const contentType =
        audioResponse.headers.get("content-type") ?? "application/octet-stream";
      const audioBuffer = await readAudioWithLimit(audioResponse);
      const audioBlob = new Blob([audioBuffer], { type: contentType });

      let payload: HuggingFaceAsrResponse | null = null;
      let usedEndpoint: string | undefined;
      let lastError: string | null = null;

      for (const endpoint of endpoints) {
        const endpointClient = inferenceClient.endpoint(endpoint);
        try {
          const endpointPayload = await withOperationTimeout(
            endpointClient.automaticSpeechRecognition({
              model,
              data: audioBlob,
            }),
            "TIMEOUT_HF_INFERENCE: Превышено время ожидания ответа Hugging Face",
            HF_INFERENCE_TIMEOUT_MS,
          );
          const parsedPayload =
            huggingFaceAsrResponseSchema.safeParse(endpointPayload);
          if (!parsedPayload.success) {
            logger.warn("Некорректный формат ответа Hugging Face ASR", {
              endpoint,
              model,
              issues: parsedPayload.error.issues.map((issue) => issue.message),
            });
            payload = { text: "" };
          } else {
            payload = parsedPayload.data;
          }
          usedEndpoint = endpoint;
          break;
        } catch (error) {
          const errorMessage = toErrorMessage(error);
          const status = getHttpStatus(error);
          lastError = `Hugging Face ASR error (model=${model}, endpoint=${endpoint}${status ? `, status=${status}` : ""}): ${errorMessage}`;
          if (status === 404 || status === 410) {
            logger.warn(
              "Hugging Face ASR endpoint недоступен, пробуем fallback",
              {
                endpoint,
                model,
                status,
                error: errorMessage,
              },
            );
            continue;
          }
          if (isTransientNetworkError(error)) {
            logger.warn(
              "Сетевая ошибка Hugging Face ASR endpoint, пробуем fallback",
              {
                endpoint,
                model,
                error: errorMessage,
              },
            );
            continue;
          }
          throw new Error(lastError);
        }
      }

      if (!payload) {
        throw new Error(
          lastError ?? "Hugging Face ASR API: неизвестная ошибка",
        );
      }

      if (!Array.isArray(payload) && payload.error) {
        throw new Error(`Hugging Face ASR: ${payload.error}`);
      }

      const text = parseTranscript(payload);
      const processingTimeMs = Date.now() - start;

      logger.info("Hugging Face распознавание завершено", {
        model,
        revision,
        processingTimeMs,
        textLength: text.length,
      });

      const rawModelPayload: RawModelPayload = {
        model,
        revision: revision || undefined,
        endpoint: usedEndpoint,
      };

      return {
        source: "huggingface",
        text,
        processingTimeMs,
        raw: rawModelPayload,
      };
    },
    {
      maxAttempts: 3,
      baseDelayMs: 2500,
      onRetry: (attempt, error) =>
        logger.warn("Повторная попытка Hugging Face ASR", {
          attempt,
          model,
          error: toErrorMessage(error),
        }),
    },
  );
}

export function getHuggingFaceAsrModels(): string[] {
  const configuredList = env.HUGGINGFACE_ASR_MODELS?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configuredList && configuredList.length > 0) {
    return [...new Set(configuredList)];
  }

  const fallback = [
    env.HUGGINGFACE_ASR_MODEL?.trim() || DEFAULT_HF_ASR_MODEL,
    ...ADDITIONAL_DEFAULT_HF_ASR_MODELS,
  ].filter(Boolean);

  return [...new Set(fallback)];
}
