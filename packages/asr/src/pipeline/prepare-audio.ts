import { createLogger } from "@calls/logger";
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
  preprocessingResult: PreprocessingResult | null;
}> {
  let processedAudioUrl = audioUrl;
  let preprocessingResult: PreprocessingResult | null = null;

  if (options?.skipAudioPreprocessing) {
    return { processedAudioUrl, preprocessingResult };
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

    // processedAudioUrl остаётся исходным URL; улучшение сохраняется позже,
    // и уже после этого для ASR создаётся корректный presigned URL.
    processedAudioUrl = preprocessingResult.audioUrl;

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

  return { processedAudioUrl, preprocessingResult };
}
