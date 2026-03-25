/**
 * Клиент для Python микросервиса продвинутой обработки аудио.
 * Использует noisereduce, Silero VAD и другие ML-модели для улучшения качества.
 * Работает полностью в памяти без временных файлов.
 */

import { env } from "@calls/config";
import { createLogger } from "../logger";

const logger = createLogger("audio-enhancer-client");

let loggedMissingEnhancerUrl = false;

function logMissingEnhancerUrlOnce(): void {
  if (loggedMissingEnhancerUrl) return;
  loggedMissingEnhancerUrl = true;
  logger.info(
    "AUDIO_ENHANCER_URL не задан — продвинутая Python-обработка отключена (режим только FFmpeg или без enhancer).",
  );
}

export interface EnhancerOptions {
  /** Применить ML-based шумоподавление (noisereduce) */
  noiseReduction?: boolean;
  /** Нормализовать громкость */
  normalizeVolume?: boolean;
  /** Усилить речевые частоты */
  enhanceSpeech?: boolean;
  /** Удалить паузы с помощью Silero VAD */
  removeSilence?: boolean;
  /** Целевая частота дискретизации */
  targetSampleRate?: number;
}

export interface EnhancerResult {
  /** Обработанное аудио (Buffer) */
  audioBuffer: Buffer;
  /** Был ли сервис доступен */
  wasProcessed: boolean;
  /** Время обработки в мс */
  processingTimeMs: number;
}

/**
 * Улучшает аудио с помощью Python микросервиса
 */
export async function enhanceAudioWithPython(
  audioBuffer: Buffer,
  options: EnhancerOptions = {},
): Promise<EnhancerResult> {
  const start = Date.now();
  const serviceUrl = env.AUDIO_ENHANCER_URL;

  if (!serviceUrl) {
    logMissingEnhancerUrlOnce();
    return {
      audioBuffer,
      wasProcessed: false,
      processingTimeMs: Date.now() - start,
    };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as unknown as BlobPart], {
      type: "audio/wav",
    });
    formData.append("file", blob, "audio.wav");

    formData.append("noise_reduction", String(options.noiseReduction ?? true));
    formData.append(
      "normalize_volume",
      String(options.normalizeVolume ?? true),
    );
    formData.append("enhance_speech", String(options.enhanceSpeech ?? true));
    formData.append("remove_silence", String(options.removeSilence ?? false));
    formData.append(
      "target_sample_rate",
      String(options.targetSampleRate ?? 16000),
    );

    logger.info("Отправка аудио в Python enhancer", {
      serviceUrl,
      audioSize: audioBuffer.length,
      options,
    });

    const response = await fetch(`${serviceUrl}/enhance`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(
        `Python enhancer вернул ошибку: ${response.status} ${response.statusText}`,
      );
    }

    const enhancedBuffer = Buffer.from(await response.arrayBuffer());
    const processingTimeMs = Date.now() - start;

    logger.info("Python обработка завершена", {
      processingTimeMs,
      inputSize: audioBuffer.length,
      outputSize: enhancedBuffer.length,
    });

    return {
      audioBuffer: enhancedBuffer,
      wasProcessed: true,
      processingTimeMs,
    };
  } catch (error) {
    logger.error("Ошибка Python обработки аудио", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      audioBuffer,
      wasProcessed: false,
      processingTimeMs: Date.now() - start,
    };
  }
}

/**
 * Только шумоподавление (быстрый метод)
 */
export async function denoiseAudioWithPython(
  audioBuffer: Buffer,
  options: {
    stationary?: boolean;
    propDecrease?: number;
  } = {},
): Promise<EnhancerResult> {
  const start = Date.now();
  const serviceUrl = env.AUDIO_ENHANCER_URL;

  if (!serviceUrl) {
    logMissingEnhancerUrlOnce();
    return {
      audioBuffer,
      wasProcessed: false,
      processingTimeMs: Date.now() - start,
    };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as unknown as BlobPart], {
      type: "audio/wav",
    });
    formData.append("file", blob, "audio.wav");
    formData.append("stationary", String(options.stationary ?? true));
    formData.append("prop_decrease", String(options.propDecrease ?? 0.8));

    const response = await fetch(`${serviceUrl}/denoise`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Denoise error: ${response.status}`);
    }

    const denoisedBuffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer: denoisedBuffer,
      wasProcessed: true,
      processingTimeMs: Date.now() - start,
    };
  } catch (error) {
    logger.error("Ошибка шумоподавления", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      audioBuffer,
      wasProcessed: false,
      processingTimeMs: Date.now() - start,
    };
  }
}
