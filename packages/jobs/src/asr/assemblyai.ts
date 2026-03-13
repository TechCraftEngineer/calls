/**
 * AssemblyAI ASR провайдер через @ai-sdk/assemblyai.
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/assemblyai
 */

import { assemblyai } from "@ai-sdk/assemblyai";
import { env } from "@calls/config";
import { experimental_transcribe as transcribe } from "ai";
import { createLogger } from "../logger";
import { withRetry } from "./retry";
import type { AsrResult, Utterance } from "./types";

const logger = createLogger("asr-assemblyai");

/** Таймаут транскрибации — 10 минут (длинные записи) */
const TRANSCRIBE_TIMEOUT_MS = 10 * 60 * 1000;

export async function transcribeWithAssemblyAi(
  audioUrl: string,
): Promise<AsrResult | null> {
  if (!env.ASSEMBLYAI_API_KEY) {
    logger.warn("ASSEMBLYAI_API_KEY не задан, пропускаем AssemblyAI");
    return null;
  }

  const start = Date.now();

  return withRetry(
    async () => {
      const transcript = await transcribe({
        model: assemblyai.transcription("best"),
        audio: new URL(audioUrl),
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
        providerOptions: {
          assemblyai: {
            speakerLabels: true,
            languageCode: "ru",
            punctuate: true,
            formatText: true,
          },
        },
      });

      const processingTimeMs = Date.now() - start;
      const segments = transcript.segments ?? [];

      const utterances: Utterance[] = segments.flatMap((s) => {
        const seg = s as {
          text: string;
          startSecond?: number;
          endSecond?: number;
          speaker?: string;
        };
        const text = seg.text ?? "";
        if (!text.trim()) return [];
        return [
          {
            speaker: `Спикер ${seg.speaker ?? "?"}`,
            text,
            start: seg.startSecond,
            end: seg.endSecond,
          } satisfies Utterance,
        ];
      });

      const text =
        transcript.text ??
        (utterances
          .map((u) => `${u.speaker}: ${u.text}`)
          .join("\n\n")
          .trim() ||
          "");

      const confidence = (
        transcript.providerMetadata?.assemblyai as { confidence?: number }
      )?.confidence;

      logger.info("AssemblyAI распознавание завершено", {
        processingTimeMs,
        segmentCount: segments.length,
        textLength: text.length,
        confidence,
      });

      return {
        source: "assemblyai",
        text,
        utterances: utterances.length > 0 ? utterances : undefined,
        confidence,
        processingTimeMs,
        raw: {
          segmentCount: segments.length,
          language: transcript.language,
          durationInSeconds: transcript.durationInSeconds,
        } as Record<string, unknown>,
      };
    },
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      onRetry: (attempt, error) =>
        logger.warn("Повторная попытка AssemblyAI", {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        }),
    },
  );
}
