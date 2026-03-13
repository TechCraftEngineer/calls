/**
 * Yandex SpeechKit ASR провайдер.
 * Использует асинхронное распознавание (Long Running Recognition).
 * Поддерживает MP3 через Transcribe API v3.
 *
 * @see https://yandex.cloud/ru/docs/speechkit/stt/api/transcribation-api-v3
 */

import { env } from "@calls/config";
import { createLogger } from "../logger";
import { withRetry } from "./retry";
import type { AsrResult } from "./types";

const logger = createLogger("asr-yandex");

const YANDEX_OPERATIONS_BASE =
  "https://operation.api.cloud.yandex.net/operations";
const YANDEX_TRANSCRIBE_URL =
  "https://transcribe.api.cloud.yandex.net/speech/stt/v2/longRunningRecognize";

async function pollUntilDone(operationId: string): Promise<{
  done: boolean;
  response?: {
    chunks?: Array<{ alternatives?: Array<{ text?: string }> }>;
  };
}> {
  const apiKey = env.YANDEX_SPEECHKIT_API_KEY!;
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
): Promise<AsrResult | null> {
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
              audioEncoding: "MP3",
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

          const processingTimeMs = Date.now() - start;
          logger.info("Yandex распознавание завершено", {
            processingTimeMs,
            textLength: text.length,
          });

          return {
            source: "yandex",
            text,
            processingTimeMs,
            raw: { operationId } as Record<string, unknown>,
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
