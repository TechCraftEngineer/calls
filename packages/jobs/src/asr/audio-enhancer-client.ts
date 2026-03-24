/**
 * Клиент для Python микросервиса продвинутой обработки аудио.
 * Использует noisereduce, Silero VAD и другие ML-модели для улучшения качества.
 * Работает полностью в памяти без временных файлов.
 */

import { env } from "@calls/config";
import { createLogger } from "../logger";

const logger = createLogger("audio-enhancer-client");

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
 * Проверяет доступность Python микросервиса
 */
async function checkEnhancerAvailable(): Promise<boolean> {
  const serviceUrl = env.AUDIO_ENHANCER_URL;
  if (!serviceUrl) {
    return false;
  }

  try {
    const response = await fetch(`${serviceUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
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
    logger.warn(
      "AUDIO_ENHANCER_URL не задан, пропускаем Python обработку. " +
        "Установите переменную окружения для использования продвинутого шумоподавления.",
    );
    return {
      audioBuffer,
      wasProcessed: false,
      processingTimeMs: Date.now() - start,
    };
  }

  // Проверяем доступность сервиса
  const isAvailable = await checkEnhancerAvailable();
  if (!isAvailable) {
    logger.warn(
      `Python audio enhancer недоступен по адресу ${serviceUrl}, пропускаем обработку`,
    );
    return {
      audioBuffer,
      wasProcessed: false,
      processingTimeMs: Date.now() - start,
    };
  }

  try {
    // Создаем FormData для отправки файла
    const formData = new FormData();
    const blob = new Blob([audioBuffer as unknown as BlobPart], {
      type: "audio/wav",
    });
    formData.append("file", blob, "audio.wav");

    // Добавляем опции
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

    // Отправляем запрос
    const response = await fetch(`${serviceUrl}/enhance`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60_000), // 60 секунд таймаут
    });

    if (!response.ok) {
      throw new Error(
        `Python enhancer вернул ошибку: ${response.status} ${response.statusText}`,
      );
    }

    // Получаем обработанное аудио
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
    // При ошибке возвращаем исходное аудио
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
