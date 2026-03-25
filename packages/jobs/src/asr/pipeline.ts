/**
 * Конвейер обработки аудио: ASR (параллельно) → LLM объединение → LLM нормализация
 */

import {
  deleteObjectFromS3,
  generateS3Key,
  getDownloadUrlForAsr,
  uploadBufferToS3,
} from "@calls/lib";
import {
  type PreprocessingOptions,
  preprocessAudio,
  safeAudioUrlParts,
} from "~/asr/audio-preprocessing";
import { createLogger } from "../logger";
import { transcribeWithAssemblyAi } from "./assemblyai";
import { correctWithContext } from "./context-correction";
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
const ASR_LOG_TEXT_MAX_LENGTH = 500;
const ASR_LOG_ERROR_MAX_LENGTH = 300;

function truncateForLog(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}

function parseHuggingFaceRaw(
  raw: unknown,
): { model?: string; revision?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Record<string, unknown>;
  const model = typeof parsed.model === "string" ? parsed.model : undefined;
  const revision =
    typeof parsed.revision === "string" ? parsed.revision : undefined;
  return { model, revision };
}

export async function runTranscriptionPipeline(
  audioUrl: string,
  options?: {
    skipNormalization?: boolean;
    skipContextCorrection?: boolean;
    skipAudioPreprocessing?: boolean;
    audioPreprocessing?: PreprocessingOptions;
    summaryPrompt?: string;
    companyContext?: string | null;
  },
): Promise<PipelineResult> {
  const start = Date.now();
  const safeIn = safeAudioUrlParts(audioUrl);
  logger.info("Запуск конвейера распознавания", {
    host: safeIn.host,
    basename: safeIn.basename,
  });

  // Предобработка аудио (автоматический fallback: Python ML → FFmpeg → без обработки)
  let processedAudioUrl = audioUrl;
  let tempKey: string | null = null;
  let preprocessingResult: Awaited<ReturnType<typeof preprocessAudio>> | null =
    null;
  try {
    if (!options?.skipAudioPreprocessing) {
      preprocessingResult = await preprocessAudio(audioUrl, {
        // По умолчанию пытаемся использовать Python ML (если доступен)
        // Если недоступен - автоматически fallback на FFmpeg
        // Если FFmpeg недоступен - без обработки
        normalizeVolume: true, // КРИТИЧНО для тихих слов
        enhanceSpeech: true, // Усиление речевых частот
        noiseReduction: false, // Осторожно, может искажать
        ...options?.audioPreprocessing,
      });
      processedAudioUrl = preprocessingResult.audioUrl;
      if (
        preprocessingResult.wasProcessed &&
        preprocessingResult.enhancedAudioBuffer &&
        preprocessingResult.enhancedAudioBuffer.length > 0
      ) {
        try {
          tempKey = generateS3Key(
            preprocessingResult.enhancedAudioFilename ?? "enhanced-audio.wav",
            true,
          );
          await uploadBufferToS3(
            tempKey,
            preprocessingResult.enhancedAudioBuffer,
            "audio/wav",
          );
          processedAudioUrl = await getDownloadUrlForAsr(tempKey);
          logger.info("Для ASR используется временный URL улучшенного аудио", {
            storageKey: tempKey,
          });
        } catch (err) {
          logger.warn(
            "Не удалось выгрузить улучшенное аудио для ASR, используем исходный URL",
            {
              error: err instanceof Error ? err.message : String(err),
            },
          );
          processedAudioUrl = preprocessingResult.audioUrl;
        }
      }
      if (preprocessingResult.wasProcessed) {
        logger.info("Аудио предобработано", {
          appliedFilters: preprocessingResult.appliedFilters,
          processingTimeMs: preprocessingResult.processingTimeMs,
        });
      }
    }
  } catch (error) {
    logger.warn("Предобработка аудио не удалась, используем оригинал", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fallback на оригинальный аудио
    preprocessingResult = null;
    processedAudioUrl = audioUrl;
  }
  try {
    // Параллельно: ASR + извлечение длительности (music-metadata, без зависимости от ASR)
    const huggingFaceModels = getHuggingFaceAsrModels();
    const [assemblyaiResult, yandexResult, huggingFaceResults, durationResult] =
      await Promise.allSettled([
        transcribeWithAssemblyAi(processedAudioUrl),
        transcribeWithYandex(processedAudioUrl),
        Promise.allSettled(
          huggingFaceModels.map((model) =>
            transcribeWithHuggingFace(processedAudioUrl, model),
          ),
        ),
        getAudioDurationFromUrl(processedAudioUrl),
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
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
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

    // Контекстная коррекция: исправляем ошибки ASR с учетом контекста разговора
    let contextCorrectedText = rawText;
    if (!options?.skipContextCorrection && rawText.trim().length > 0) {
      contextCorrectedText = await correctWithContext(rawText, {
        companyContext: options?.companyContext,
      });
    }

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
          text: truncateForLog(assemblyaiText, ASR_LOG_TEXT_MAX_LENGTH),
          confidence: assemblyai?.confidence,
          utterances: undefined,
          raw: undefined,
          error: truncateForLog(assemblyaiError, ASR_LOG_ERROR_MAX_LENGTH),
        },
        {
          provider: "yandex",
          success: !!yandex,
          processingTimeMs: yandex?.processingTimeMs,
          text: truncateForLog(yandexText, ASR_LOG_TEXT_MAX_LENGTH),
          confidence: yandex?.confidence,
          utterances: undefined,
          raw: undefined,
          error: truncateForLog(yandexError, ASR_LOG_ERROR_MAX_LENGTH),
        },
        {
          provider: "huggingface",
          success: huggingFaceSuccessful.length > 0,
          processingTimeMs: huggingFaceBest?.processingTimeMs,
          text:
            huggingFaceTexts.length > 0
              ? truncateForLog(
                  huggingFaceTexts.join("\n\n---\n\n"),
                  ASR_LOG_TEXT_MAX_LENGTH,
                )
              : undefined,
          confidence: huggingFaceBest?.confidence,
          utterances: undefined,
          raw: {
            modelCount: huggingFaceSuccessful.length,
            models: huggingFaceSuccessful.map((result) => {
              const raw = parseHuggingFaceRaw(result.raw);
              return {
                model: raw?.model,
                revision: raw?.revision,
                processingTimeMs: result.processingTimeMs,
                textLength: result.text.length,
              };
            }),
            errorCount: huggingFaceErrors.length,
          },
          error:
            huggingFaceErrors.length > 0
              ? truncateForLog(
                  huggingFaceErrors.join(" | "),
                  ASR_LOG_ERROR_MAX_LENGTH,
                )
              : undefined,
        },
      ],
    };

    let normalizedText = contextCorrectedText;
    if (!options?.skipNormalization && contextCorrectedText.trim().length > 0) {
      normalizedText = await normalizeWithLlm(contextCorrectedText);
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
      contextCorrectedLength: contextCorrectedText.length,
      normalizedLength: normalizedText.length,
      hasSummary: !!summary,
      hasAssemblyai: !!assemblyai,
      hasYandex: !!yandex,
      hasHuggingFace: huggingFaceSuccessful.length > 0,
      huggingFaceModelCount: huggingFaceModels.length,
      huggingFaceSuccessCount: huggingFaceSuccessful.length,
      contextCorrectionApplied:
        !options?.skipContextCorrection && contextCorrectedText !== rawText,
      audioPreprocessed: preprocessingResult?.wasProcessed ?? false,
      hasEnhancedAudio: !!preprocessingResult?.enhancedAudioBuffer,
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
      enhancedAudioBuffer: preprocessingResult?.enhancedAudioBuffer,
      enhancedAudioFilename: preprocessingResult?.enhancedAudioFilename,
    };
  } finally {
    if (tempKey) {
      try {
        await deleteObjectFromS3(tempKey);
        logger.info("Временный объект улучшенного аудио удалён", {
          storageKey: tempKey,
        });
      } catch (cleanupError) {
        logger.warn("Не удалось удалить временный объект улучшенного аудио", {
          storageKey: tempKey,
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }
    }
  }
}
