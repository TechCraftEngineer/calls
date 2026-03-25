import { deleteObjectFromS3 } from "@calls/lib";
import { createLogger } from "../../logger";
import {
  type PreprocessingOptions,
  type PreprocessingResult,
  safeAudioUrlParts,
} from "../audio/audio-preprocessing";
import { mergeAsrWithLlm } from "../llm/merge-asr";
import type { PipelineResult } from "../types";
import { buildTranscriptMetadata } from "./build-metadata";
import { postProcessText } from "./post-process";
import { prepareAudioForAsr } from "./prepare-audio";
import { runAsrProviders } from "./run-asr-providers";

const logger = createLogger("asr-pipeline");

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

  // Используется только если мы отправляем в Yandex PCM (LINEAR16_PCM).
  const yandexSampleRateHertz =
    options?.audioPreprocessing?.targetSampleRate ?? 16000;

  let tempKey: string | null = null;
  let preprocessingResult: PreprocessingResult | null = null;

  try {
    const prepared = await prepareAudioForAsr(audioUrl, {
      skipAudioPreprocessing: options?.skipAudioPreprocessing,
      audioPreprocessing: options?.audioPreprocessing,
    });

    tempKey = prepared.tempKey;
    preprocessingResult = prepared.preprocessingResult;

    const asr = await runAsrProviders(
      prepared.processedAudioUrl,
      tempKey,
      yandexSampleRateHertz,
    );

    const assemblyaiText = asr.assemblyai?.text?.trim() ?? "";
    const yandexText = asr.yandex?.text?.trim() ?? "";
    const huggingFaceTexts = asr.huggingFaceSuccessful
      .map((result) => result.text.trim())
      .filter(Boolean);
    const huggingFaceText = asr.huggingFaceBest?.text?.trim() ?? "";

    // LLM объединяет оба транскрипта (или возвращает единственный)
    const rawText = await mergeAsrWithLlm({
      assemblyaiText: assemblyaiText || undefined,
      yandexText: yandexText || undefined,
      huggingFaceText: huggingFaceText || undefined,
      huggingFaceTexts,
    });

    const post = await postProcessText({
      rawText,
      startTs: start,
      options: {
        skipNormalization: options?.skipNormalization,
        skipContextCorrection: options?.skipContextCorrection,
        summaryPrompt: options?.summaryPrompt,
        companyContext: options?.companyContext,
      },
    });

    const metadata = buildTranscriptMetadata({
      assemblyai: asr.assemblyai,
      yandex: asr.yandex,
      huggingFaceSuccessful: asr.huggingFaceSuccessful,
      huggingFaceBest: asr.huggingFaceBest,
      assemblyaiError: asr.assemblyaiError,
      yandexError: asr.yandexError,
      huggingFaceErrors: asr.huggingFaceErrors,
      durationFromUrl: asr.durationFromUrl,
      processingTimeMs: post.processingTimeMs,
    });

    logger.info("Конвейер завершён", {
      processingTimeMs: post.processingTimeMs,
      asrSource: metadata.asrSource,
      rawLength: rawText.length,
      contextCorrectedLength: post.contextCorrectedText.length,
      normalizedLength: post.normalizedText.length,
      hasSummary: !!post.summary,
      hasAssemblyai: !!asr.assemblyai,
      hasYandex: !!asr.yandex,
      hasHuggingFace: asr.huggingFaceSuccessful.length > 0,
      huggingFaceModelCount: asr.huggingFaceModelCount,
      huggingFaceSuccessCount: asr.huggingFaceSuccessCount,
      contextCorrectionApplied:
        !options?.skipContextCorrection &&
        post.contextCorrectedText !== rawText,
      audioPreprocessed: preprocessingResult?.wasProcessed ?? false,
      hasEnhancedAudio: !!preprocessingResult?.enhancedAudioBuffer,
    });

    return {
      rawText,
      normalizedText: post.normalizedText,
      metadata,
      summary: post.summary,
      sentiment: post.sentiment,
      title: post.title,
      callType: post.callType,
      callTopic: post.callTopic,
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
