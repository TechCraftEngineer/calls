/**
 * Hugging Face ASR провайдер.
 * Базовый сценарий: Inference API для моделей типа audio-to-text.
 */

import { env } from "@calls/config";
import { createLogger } from "../logger";
import { withRetry } from "./retry";
import type { AsrResult } from "./types";

const logger = createLogger("asr-huggingface");

const HF_INFERENCE_BASE = "https://api-inference.huggingface.co/models";
const DEFAULT_HF_ASR_MODEL = "ai-sage/GigaAM-v3";
const ADDITIONAL_DEFAULT_HF_ASR_MODELS = ["microsoft/VibeVoice-ASR"] as const;

type HuggingFaceAsrResponse =
  | { text?: string; error?: string; estimated_time?: number }
  | Array<{ text?: string }>;

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
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(
          `Не удалось скачать аудио: ${audioResponse.status} ${audioResponse.statusText}`,
        );
      }

      const contentType =
        audioResponse.headers.get("content-type") ?? "application/octet-stream";
      const audioBuffer = await audioResponse.arrayBuffer();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Hugging Face ASR API: ${response.status} ${response.statusText} ${errorText}`,
        );
      }

      const payload = (await response.json()) as HuggingFaceAsrResponse;
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

      return {
        source: "huggingface",
        text,
        processingTimeMs,
        raw: {
          model,
          revision: revision || undefined,
        } as Record<string, unknown>,
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
