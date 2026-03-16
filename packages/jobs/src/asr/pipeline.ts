/**
 * Конвейер обработки аудио: ASR (параллельно) → LLM объединение → LLM нормализация
 */

import { createLogger } from "../logger";
import { transcribeWithAssemblyAi } from "./assemblyai";
import { getAudioDurationFromUrl } from "./get-audio-duration";
import { mergeAsrWithLlm } from "./merge-asr";
import { normalizeWithLlm } from "./normalize";
import { summarizeWithLlm } from "./summarize";
import type { AsrSource, PipelineResult, TranscriptMetadata } from "./types";
import { transcribeWithYandex } from "./yandex";

const logger = createLogger("asr-pipeline");

export async function runTranscriptionPipeline(
  audioUrl: string,
  options?: {
    skipNormalization?: boolean;
    summaryPrompt?: string;
    companyContext?: string | null;
  },
): Promise<PipelineResult> {
  const start = Date.now();
  logger.info("Запуск конвейера распознавания", {
    audioUrl: audioUrl.slice(0, 80),
  });

  // Параллельно: ASR + извлечение длительности (music-metadata, без зависимости от ASR)
  const [assemblyaiResult, yandexResult, durationResult] =
    await Promise.allSettled([
      transcribeWithAssemblyAi(audioUrl),
      transcribeWithYandex(audioUrl),
      getAudioDurationFromUrl(audioUrl),
    ]);

  const assemblyai =
    assemblyaiResult.status === "fulfilled" ? assemblyaiResult.value : null;
  const yandex =
    yandexResult.status === "fulfilled" ? yandexResult.value : null;

  if (assemblyaiResult.status === "rejected") {
    logger.warn("AssemblyAI распознавание не удалось", {
      error:
        assemblyaiResult.reason instanceof Error
          ? assemblyaiResult.reason.message
          : String(assemblyaiResult.reason),
    });
  }
  if (yandexResult.status === "rejected") {
    logger.warn("Yandex распознавание не удалось", {
      error:
        yandexResult.reason instanceof Error
          ? yandexResult.reason.message
          : String(yandexResult.reason),
    });
  }

  if (!assemblyai && !yandex) {
    throw new Error(
      "Ни один ASR провайдер не вернул результат (проверьте API ключи)",
    );
  }

  const assemblyaiText = assemblyai?.text?.trim() ?? "";
  const yandexText = yandex?.text?.trim() ?? "";

  // LLM объединяет оба транскрипта (или возвращает единственный)
  const rawText = await mergeAsrWithLlm({
    assemblyaiText: assemblyaiText || undefined,
    yandexText: yandexText || undefined,
  });

  const processingTimeMs = Date.now() - start;

  // Приоритет: music-metadata (локально) → fallback на AssemblyAI
  const durationFromMetadata =
    durationResult.status === "fulfilled" ? durationResult.value : undefined;
  const durationFromAssemblyai = assemblyai?.raw
    ? (assemblyai.raw as { durationInSeconds?: number }).durationInSeconds
    : undefined;
  const durationInSeconds =
    typeof durationFromMetadata === "number"
      ? durationFromMetadata
      : durationFromAssemblyai;

  const asrSource: AsrSource =
    assemblyaiText && yandexText
      ? "merged"
      : assemblyai
        ? "assemblyai"
        : "yandex";

  const metadata: TranscriptMetadata = {
    asrSource,
    processingTimeMs,
    confidence: assemblyai?.confidence ?? yandex?.confidence,
    speakerCount: assemblyai?.utterances?.length,
    durationInSeconds:
      typeof durationInSeconds === "number" ? durationInSeconds : undefined,
    asrAssemblyai: assemblyai
      ? {
          text: assemblyaiText || undefined,
          confidence: assemblyai.confidence,
          hasUtterances: !!assemblyai.utterances?.length,
          processingTimeMs: assemblyai.processingTimeMs,
        }
      : undefined,
    asrYandex: yandex
      ? {
          text: yandexText || undefined,
          processingTimeMs: yandex.processingTimeMs,
        }
      : undefined,
  };

  let normalizedText = rawText;
  if (!options?.skipNormalization && rawText.trim().length > 0) {
    normalizedText = await normalizeWithLlm(rawText);
  }

  const defaultTopic = "Не определена";
  let summary: string | undefined;
  let sentiment: string | undefined;
  let title: string | undefined;
  let callTopic: string | undefined = defaultTopic;

  if (normalizedText.trim().length > 0) {
    const analysis = await summarizeWithLlm(normalizedText, {
      summaryPrompt: options?.summaryPrompt,
      companyContext: options?.companyContext,
    });
    summary = analysis.summary;
    sentiment = analysis.sentiment;
    title = analysis.title;
    callTopic = analysis.callTopic ?? defaultTopic;
  }

  logger.info("Конвейер завершён", {
    processingTimeMs,
    asrSource,
    rawLength: rawText.length,
    normalizedLength: normalizedText.length,
    hasSummary: !!summary,
    hasAssemblyai: !!assemblyai,
    hasYandex: !!yandex,
  });

  return {
    rawText,
    normalizedText,
    metadata,
    summary,
    sentiment,
    title,
    callTopic,
  };
}
