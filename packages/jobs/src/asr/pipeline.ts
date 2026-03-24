/**
 * Конвейер обработки аудио: ASR (параллельно) → LLM объединение → LLM нормализация
 */

import { createLogger } from "../logger";
import { transcribeWithAssemblyAi } from "./assemblyai";
import { getAudioDurationFromUrl } from "./get-audio-duration";
import {
  getHuggingFaceAsrModels,
  transcribeWithHuggingFace,
} from "./huggingface";
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
  const huggingFaceModels = getHuggingFaceAsrModels();
  const [assemblyaiResult, yandexResult, huggingFaceResults, durationResult] =
    await Promise.allSettled([
      transcribeWithAssemblyAi(audioUrl),
      transcribeWithYandex(audioUrl),
      Promise.allSettled(
        huggingFaceModels.map((model) =>
          transcribeWithHuggingFace(audioUrl, model),
        ),
      ),
      getAudioDurationFromUrl(audioUrl),
    ]);

  const assemblyai =
    assemblyaiResult.status === "fulfilled" ? assemblyaiResult.value : null;
  const yandex =
    yandexResult.status === "fulfilled" ? yandexResult.value : null;
  const huggingFaceAttemptResults =
    huggingFaceResults.status === "fulfilled" ? huggingFaceResults.value : [];
  const huggingFaceSuccessful = huggingFaceAttemptResults.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
  const huggingFaceBest =
    huggingFaceSuccessful.length > 0
      ? huggingFaceSuccessful.reduce((best, current) =>
          current.text.length > best.text.length ? current : best,
        )
      : null;
  const assemblyaiError =
    assemblyaiResult.status === "rejected"
      ? assemblyaiResult.reason instanceof Error
        ? assemblyaiResult.reason.message
        : String(assemblyaiResult.reason)
      : undefined;
  const yandexError =
    yandexResult.status === "rejected"
      ? yandexResult.reason instanceof Error
        ? yandexResult.reason.message
        : String(yandexResult.reason)
      : undefined;
  const huggingFaceErrors = (
    huggingFaceResults.status === "fulfilled" ? huggingFaceResults.value : []
  )
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason),
    );
  if (huggingFaceResults.status === "rejected") {
    huggingFaceErrors.push(
      huggingFaceResults.reason instanceof Error
        ? huggingFaceResults.reason.message
        : String(huggingFaceResults.reason),
    );
  }

  if (assemblyaiResult.status === "rejected") {
    logger.warn("AssemblyAI распознавание не удалось", {
      error: assemblyaiError,
    });
  }
  if (yandexResult.status === "rejected") {
    logger.warn("Yandex распознавание не удалось", {
      error: yandexError,
    });
  }
  if (huggingFaceErrors.length > 0) {
    logger.warn("Hugging Face распознавание не удалось", {
      errors: huggingFaceErrors,
    });
  }

  if (!assemblyai && !yandex && !huggingFaceBest) {
    throw new Error(
      "Ни один ASR провайдер не вернул результат (проверьте API ключи)",
    );
  }

  const assemblyaiText = assemblyai?.text?.trim() ?? "";
  const yandexText = yandex?.text?.trim() ?? "";
  const huggingFaceTexts = huggingFaceSuccessful
    .map((result) => result.text.trim())
    .filter(Boolean);
  const huggingFaceText = huggingFaceBest?.text?.trim() ?? "";

  // LLM объединяет оба транскрипта (или возвращает единственный)
  const rawText = await mergeAsrWithLlm({
    assemblyaiText: assemblyaiText || undefined,
    yandexText: yandexText || undefined,
    huggingFaceText: huggingFaceText || undefined,
    huggingFaceTexts,
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

  const successfulProviders: AsrSource[] = [];
  if (assemblyaiText) successfulProviders.push("assemblyai");
  if (yandexText) successfulProviders.push("yandex");
  if (huggingFaceTexts.length > 0) successfulProviders.push("huggingface");
  const asrSource: AsrSource =
    successfulProviders.length > 1
      ? "merged"
      : (successfulProviders[0] ?? "merged");

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
    asrHuggingFace: huggingFaceBest
      ? {
          text: huggingFaceText || undefined,
          confidence: huggingFaceBest.confidence,
          hasUtterances: !!huggingFaceBest.utterances?.length,
          processingTimeMs: huggingFaceBest.processingTimeMs,
        }
      : undefined,
    asrLogs: [
      {
        provider: "assemblyai",
        success: !!assemblyai,
        processingTimeMs: assemblyai?.processingTimeMs,
        text: assemblyaiText || undefined,
        confidence: assemblyai?.confidence,
        utterances: assemblyai?.utterances,
        raw: assemblyai?.raw,
        error: assemblyaiError,
      },
      {
        provider: "yandex",
        success: !!yandex,
        processingTimeMs: yandex?.processingTimeMs,
        text: yandexText || undefined,
        confidence: yandex?.confidence,
        utterances: yandex?.utterances,
        raw: yandex?.raw,
        error: yandexError,
      },
      {
        provider: "huggingface",
        success: huggingFaceSuccessful.length > 0,
        processingTimeMs: huggingFaceBest?.processingTimeMs,
        text:
          huggingFaceTexts.length > 0
            ? huggingFaceTexts.join("\n\n---\n\n")
            : undefined,
        confidence: huggingFaceBest?.confidence,
        utterances: huggingFaceBest?.utterances,
        raw: {
          models: huggingFaceSuccessful.map((result) => result.raw),
          errors: huggingFaceErrors,
        } as Record<string, unknown>,
        error:
          huggingFaceErrors.length > 0
            ? huggingFaceErrors.join(" | ")
            : undefined,
      },
    ],
  };

  let normalizedText = rawText;
  if (!options?.skipNormalization && rawText.trim().length > 0) {
    normalizedText = await normalizeWithLlm(rawText);
  }

  const defaultTopic = "Не определена";
  let summary: string | undefined;
  let sentiment: string | undefined;
  let title: string | undefined;
  let callType: string | undefined = "Другое";
  let callTopic: string | undefined = defaultTopic;

  if (normalizedText.trim().length > 0) {
    const analysis = await summarizeWithLlm(normalizedText, {
      summaryPrompt: options?.summaryPrompt,
      companyContext: options?.companyContext,
    });
    summary = analysis.summary;
    sentiment = analysis.sentiment;
    title = analysis.title;
    callType = analysis.callType ?? "Другое";
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
    hasHuggingFace: huggingFaceSuccessful.length > 0,
    huggingFaceModelCount: huggingFaceModels.length,
    huggingFaceSuccessCount: huggingFaceSuccessful.length,
  });

  return {
    rawText,
    normalizedText,
    metadata,
    summary,
    sentiment,
    title,
    callType,
    callTopic,
  };
}
