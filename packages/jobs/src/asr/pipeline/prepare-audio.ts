import {
  deleteObjectFromS3,
  generateS3Key,
  getDownloadUrlForAsr,
  uploadBufferToS3,
} from "@calls/lib";
import { createLogger } from "../../logger";
import type {
  PreprocessingOptions,
  PreprocessingResult,
} from "../audio/audio-preprocessing";
import { preprocessAudio } from "../audio/audio-preprocessing";

const logger = createLogger("asr-pipeline-prepare-audio");

export async function prepareAudioForAsr(
  audioUrl: string,
  options?: {
    skipAudioPreprocessing?: boolean;
    audioPreprocessing?: PreprocessingOptions;
  },
): Promise<{
  processedAudioUrl: string;
  tempKey: string | null;
  preprocessingResult: PreprocessingResult | null;
}> {
  let processedAudioUrl = audioUrl;
  let tempKey: string | null = null;
  let preprocessingResult: PreprocessingResult | null = null;

  if (options?.skipAudioPreprocessing) {
    return { processedAudioUrl, tempKey, preprocessingResult };
  }

  try {
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
        if (tempKey) {
          try {
            await deleteObjectFromS3(tempKey);
          } catch (deleteError) {
            logger.warn("Ошибка удаления временного объекта S3", {
              storageKey: tempKey,
              error:
                deleteError instanceof Error
                  ? deleteError.message
                  : String(deleteError),
            });
          } finally {
            tempKey = null;
          }
        }
        processedAudioUrl = preprocessingResult.audioUrl;
      }
    }

    if (preprocessingResult.wasProcessed) {
      logger.info("Аудио предобработано", {
        appliedFilters: preprocessingResult.appliedFilters,
        processingTimeMs: preprocessingResult.processingTimeMs,
      });
    }
  } catch (error) {
    logger.warn("Предобработка аудио не удалась, используем оригинал", {
      error: error instanceof Error ? error.message : String(error),
    });
    preprocessingResult = null;
    processedAudioUrl = audioUrl;
  }

  return { processedAudioUrl, tempKey, preprocessingResult };
}
