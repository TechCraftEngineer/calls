/**
 * Yandex SpeechKit ASR провайдер.
 * Использует асинхронное распознавание (Long Running Recognition).
 * Поддерживает MP3 через Transcribe API v3.
 *
 * @see https://yandex.cloud/ru/docs/speechkit/stt/api/transcribation-api-v3
 */

import { env } from "@calls/config";
import { createLogger } from "../../logger";
import type { AsrResult } from "../types";
import { withRetry } from "../utils/retry";

const logger = createLogger("asr-yandex");

const YANDEX_OPERATIONS_BASE =
  "https://operation.api.cloud.yandex.net/operations";
const YANDEX_TRANSCRIBE_URL =
  "https://transcribe.api.cloud.yandex.net/speech/stt/v2/longRunningRecognize";

/** Protobuf Duration в JSON: { seconds: string, nanos?: number } */
function durationToSeconds(d?: {
  seconds?: string | number;
  nanos?: number;
}): number | undefined {
  if (!d) return undefined;
  const sec =
    typeof d.seconds === "string" ? parseInt(d.seconds, 10) : d.seconds;
  const nanos = d.nanos ?? 0;
  if (sec == null || Number.isNaN(sec)) return undefined;
  return sec + nanos / 1e9;
}

async function pollUntilDone(operationId: string): Promise<{
  done: boolean;
  response?: {
    chunks?: Array<{
      alternatives?: Array<{
        text?: string;
        words?: Array<{ end_time?: { seconds?: string; nanos?: number } }>;
      }>;
    }>;
  };
}> {
  const apiKey = env.YANDEX_SPEECHKIT_API_KEY;
  if (!apiKey) throw new Error("YANDEX_SPEECHKIT_API_KEY is required");
  const res = await fetch(`${YANDEX_OPERATIONS_BASE}/${operationId}`, {
    headers: { Authorization: `Api-Key ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Yandex Operations API: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function transcribeWithYandex(
  audioUrl: string,
  options?: {
    /**
     * Формат аудио, который фактически лежит по `audioUrl`.
     * По умолчанию считаем, что это MP3 (как ожидает SpeechKit).
     */
    audioEncoding?: "MP3" | "LINEAR16_PCM";
    /**
     * Нужен для `LINEAR16_PCM` (pcm_s16le, 16-bit signed little-endian).
     */
    sampleRateHertz?: number;
  },
): Promise<AsrResult | null> {
  if (!env.YANDEX_SPEECHKIT_ENABLED) {
    logger.info("YANDEX_SPEECHKIT_ENABLED=false, пропускаем Yandex SpeechKit");
    return null;
  }

  const apiKey = env.YANDEX_SPEECHKIT_API_KEY;
  if (!apiKey) {
    logger.warn(
      "YANDEX_SPEECHKIT_API_KEY не задан, пропускаем Yandex SpeechKit",
    );
    return null;
  }

  const start = Date.now();

  return withRetry(
    async () => {
      const audioEncoding = options?.audioEncoding ?? "MP3";
      const sampleRateHertz = options?.sampleRateHertz ?? 16000;
      if (audioEncoding === "LINEAR16_PCM" && !sampleRateHertz) {
        throw new Error("Yandex: sampleRateHertz обязателен при LINEAR16_PCM");
      }

      // Создаём задачу распознавания
      const createRes = await fetch(YANDEX_TRANSCRIBE_URL, {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            specification: {
              languageCode: "ru-RU",
              audioEncoding,
              ...(audioEncoding === "LINEAR16_PCM" && {
                sampleRateHertz: String(sampleRateHertz),
              }),
            },
          },
          audio: {
            uri: audioUrl,
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(
          `Yandex Transcribe API: ${createRes.status} - ${errText}`,
        );
      }

      const createData = (await createRes.json()) as { id?: string };
      const operationId = createData.id;
      if (!operationId) {
        throw new Error("Yandex не вернул operation id");
      }

      logger.info("Yandex задача создана, ожидание результатов", {
        operationId,
      });

      // Polling до завершения (макс ~10 мин)
      const pollInterval = 3000;
      const maxWait = 600_000;
      let elapsed = 0;
      let result: Awaited<ReturnType<typeof pollUntilDone>>;

      while (elapsed < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));
        elapsed += pollInterval;
        result = await pollUntilDone(operationId);

        if (result.done) {
          const chunks = result.response?.chunks ?? [];
          const text = chunks
            .flatMap(
              (c) =>
                (
                  c as { alternatives?: Array<{ text?: string }> }
                ).alternatives?.map((a) => a.text ?? "") ?? [],
            )
            .filter(Boolean)
            .join("\n")
            .trim();

          // Длительность: макс end_time из words (proto: end_time с seconds/nanos)
          let durationInSeconds: number | undefined;
          for (const chunk of chunks) {
            for (const alt of chunk.alternatives ?? []) {
              const words = (
                alt as {
                  words?: Array<{
                    end_time?: { seconds?: string; nanos?: number };
                  }>;
                }
              ).words;
              for (const w of words ?? []) {
                const sec = w.end_time
                  ? durationToSeconds(w.end_time)
                  : undefined;
                if (
                  sec != null &&
                  (durationInSeconds == null || sec > durationInSeconds)
                ) {
                  durationInSeconds = sec;
                }
              }
            }
          }

          const processingTimeMs = Date.now() - start;
          logger.info("Yandex распознавание завершено", {
            processingTimeMs,
            textLength: text.length,
            durationInSeconds,
          });

          return {
            source: "yandex",
            text,
            processingTimeMs,
            raw: {
              operationId,
              ...(durationInSeconds != null && { durationInSeconds }),
            } as Record<string, unknown>,
          };
        }
      }

      throw new Error("Yandex: таймаут ожидания результата");
    },
    {
      maxAttempts: 2,
      baseDelayMs: 5000,
      onRetry: (attempt, error) =>
        logger.warn("Повторная попытка Yandex SpeechKit", {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        }),
    },
  );
}
