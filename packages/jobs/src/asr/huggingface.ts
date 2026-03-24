/**
 * Hugging Face ASR провайдер.
 * Базовый сценарий: Inference API для моделей типа audio-to-text.
 */

import { env } from "@calls/config";
import { z } from "zod";
import { createLogger } from "../logger";
import { withRetry } from "./retry";
import type { AsrResult } from "./types";

const logger = createLogger("asr-huggingface");

const HF_INFERENCE_BASE = "https://api-inference.huggingface.co/models";
const DEFAULT_HF_ASR_MODEL = "ai-sage/GigaAM-v3";
const ADDITIONAL_DEFAULT_HF_ASR_MODELS = ["microsoft/VibeVoice-ASR"] as const;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

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
  const endpoint = revision
    ? `${HF_INFERENCE_BASE}/${modelPath}?revision=${encodeURIComponent(revision)}`
    : `${HF_INFERENCE_BASE}/${modelPath}`;
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

      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": contentType,
          },
          body: audioBuffer,
        },
        "TIMEOUT_HF_INFERENCE: Превышено время ожидания ответа Hugging Face",
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Hugging Face ASR API: ${response.status} ${response.statusText} ${errorText}`,
        );
      }

      const responsePayload = await response.json();
      const parsedPayload =
        huggingFaceAsrResponseSchema.safeParse(responsePayload);
      if (!parsedPayload.success) {
        logger.warn("Некорректный формат ответа Hugging Face ASR", {
          issues: parsedPayload.error.issues.map((issue) => issue.message),
        });
        return {
          source: "huggingface",
          text: "",
          processingTimeMs: Date.now() - start,
          raw: {
            model,
            revision: revision || undefined,
          } satisfies RawModelPayload,
        };
      }
      const payload = parsedPayload.data;
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
          error: error instanceof Error ? error.message : String(error),
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
