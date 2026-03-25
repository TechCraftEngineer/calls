/**
 * Предобработка аудио перед отправкой в ASR.
 * Улучшает качество распознавания через нормализацию громкости,
 * шумоподавление и оптимизацию формата.
 * Работает полностью в памяти без временных файлов.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { enhanceAudioWithPython } from "./audio-enhancer-client";
import { createLogger } from "../logger";

const execAsync = promisify(exec);
const logger = createLogger("asr-audio-preprocessing");

export interface PreprocessingOptions {
  /** Применить нормализацию громкости (рекомендуется) */
  normalizeVolume?: boolean;
  /** Применить шумоподавление (требует FFmpeg с afftdn фильтром) */
  noiseReduction?: boolean;
  /** Целевая частота дискретизации (по умолчанию 16000 Hz для ASR) */
  targetSampleRate?: number;
  /** Конвертировать в моно (рекомендуется для ASR) */
  convertToMono?: boolean;
  /** Применить эквализацию для усиления речевых частот */
  enhanceSpeech?: boolean;
  /** Удалить длинные паузы (Voice Activity Detection) */
  removesilence?: boolean;
  /** Использовать Python микросервис для продвинутой обработки (ML-based) */
  usePythonEnhancer?: boolean;
}

export interface PreprocessingResult {
  /** URL обработанного аудио (всегда исходный URL, т.к. работаем в памяти) */
  audioUrl: string;
  /** Был ли файл обработан */
  wasProcessed: boolean;
  /** Примененные фильтры */
  appliedFilters: string[];
  /** Время обработки в мс */
  processingTimeMs: number;
  /** Buffer улучшенного аудио (для сохранения в S3) */
  enhancedAudioBuffer?: Buffer;
  /** Имя файла улучшенного аудио */
  enhancedAudioFilename?: string;
}

/**
 * Проверяет доступность FFmpeg
 */
async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Создает FFmpeg фильтр-цепочку на основе опций
 */
function buildFFmpegFilters(options: PreprocessingOptions): string[] {
  const filters: string[] = [];

  // Нормализация громкости (КРИТИЧНО для тихих участков)
  if (options.normalizeVolume !== false) {
    // dynaudnorm - динамическая нормализация, лучше для речи чем loudnorm
    filters.push("dynaudnorm=f=150:g=15");
  }

  // Усиление речевых частот (300Hz-3400Hz)
  if (options.enhanceSpeech) {
    // Highpass убирает низкие частоты (гул, шум)
    filters.push("highpass=f=200");
    // Lowpass убирает высокие частоты (шипение)
    filters.push("lowpass=f=3400");
    // Небольшое усиление средних частот (речь)
    filters.push("equalizer=f=1000:width_type=h:width=1000:g=3");
  }

  // Шумоподавление (требует FFmpeg с afftdn)
  if (options.noiseReduction) {
    // afftdn - FFT-based denoiser, хорошо убирает стационарный шум
    filters.push("afftdn=nf=-25");
  }

  // Удаление длинных пауз (VAD)
  if (options.removesilence) {
    // Удаляет тишину длиннее 1 секунды
    filters.push(
      "silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB:detection=peak,silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB:detection=peak",
    );
  }

  return filters;
}

/**
 * Предобрабатывает аудио для улучшения качества ASR.
 * Работает полностью в памяти без временных файлов.
 * Автоматический fallback: Python ML → FFmpeg → без обработки
 */
export async function preprocessAudio(
  audioUrl: string,
  options: PreprocessingOptions = {},
): Promise<PreprocessingResult> {
  const start = Date.now();
  const appliedFilters: string[] = [];

  // Настройки по умолчанию (оптимальные для ASR)
  const config: Required<PreprocessingOptions> = {
    normalizeVolume: options.normalizeVolume ?? true,
    noiseReduction: options.noiseReduction ?? false,
    targetSampleRate: options.targetSampleRate ?? 16000,
    convertToMono: options.convertToMono ?? true,
    enhanceSpeech: options.enhanceSpeech ?? true,
    removesilence: options.removesilence ?? false,
    usePythonEnhancer: options.usePythonEnhancer ?? true,
  };

  // Приоритет 1: Пытаемся использовать Python ML сервис (если доступен)
  if (config.usePythonEnhancer) {
    logger.info("Попытка использовать Python ML сервис для обработки аудио");

    try {
      // Скачиваем аудио в память
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(
          `Не удалось скачать аудио: ${audioResponse.statusText}`,
        );
      }
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

      // Отправляем в Python сервис
      const result = await enhanceAudioWithPython(audioBuffer, {
        noiseReduction: config.noiseReduction,
        normalizeVolume: config.normalizeVolume,
        enhanceSpeech: config.enhanceSpeech,
        removeSilence: config.removesilence,
        targetSampleRate: config.targetSampleRate,
      });

      if (result.wasProcessed) {
        appliedFilters.push("python-ml-enhancer");
        if (config.noiseReduction) appliedFilters.push("ml-noise-reduction");
        if (config.normalizeVolume) appliedFilters.push("ml-normalize");
        if (config.enhanceSpeech) appliedFilters.push("ml-speech-enhance");
        if (config.removesilence) appliedFilters.push("silero-vad");

        logger.info("Python ML обработка успешна", {
          appliedFilters,
          processingTimeMs: result.processingTimeMs,
        });

        // Извлекаем имя файла из URL для сохранения
        const urlParts = audioUrl.split("/");
        const originalFilename = urlParts[urlParts.length - 1] || "audio.wav";
        const enhancedFilename = `enhanced_${originalFilename}`;

        return {
          audioUrl, // Возвращаем исходный URL, т.к. работаем в памяти
          wasProcessed: true,
          appliedFilters,
          processingTimeMs: result.processingTimeMs,
          enhancedAudioBuffer: result.audioBuffer,
          enhancedAudioFilename: enhancedFilename,
        };
      }

      // Python сервис недоступен, fallback на FFmpeg
      logger.info("Python сервис недоступен, используем FFmpeg fallback");
    } catch (error) {
      logger.warn("Ошибка Python обработки, используем FFmpeg fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Приоритет 2: FFmpeg (если Python недоступен или отключен)
  const hasFFmpeg = await checkFFmpegAvailable();
  if (!hasFFmpeg) {
    logger.warn(
      "FFmpeg не найден, пропускаем предобработку аудио. " +
        "Установите FFmpeg или настройте Python сервис для улучшения качества ASR.",
    );
    return {
      audioUrl,
      wasProcessed: false,
      appliedFilters: [],
      processingTimeMs: Date.now() - start,
    };
  }

  logger.info("Используем FFmpeg для обработки аудио");

  try {
    // Скачиваем аудио в память
    logger.info("Скачивание аудио для предобработки", {
      audioUrl: audioUrl.slice(0, 100),
    });
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Не удалось скачать аудио: ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Создаем FFmpeg команду для обработки в памяти
    const filters = buildFFmpegFilters(config);

    let ffmpegCmd = "ffmpeg -i pipe:0 -y";

    // Аудио фильтры
    if (filters.length > 0) {
      ffmpegCmd += ` -af "${filters.join(",")}"`;
      appliedFilters.push(...filters);
    }

    // Формат вывода (оптимизирован для ASR)
    if (config.convertToMono) {
      ffmpegCmd += " -ac 1"; // Mono
      appliedFilters.push("mono");
    }
    ffmpegCmd += ` -ar ${config.targetSampleRate}`; // Sample rate
    appliedFilters.push(`${config.targetSampleRate}Hz`);
    ffmpegCmd += " -acodec pcm_s16le"; // 16-bit PCM
    ffmpegCmd += " -f wav pipe:1"; // Вывод в pipe

    logger.info("Запуск FFmpeg предобработки", {
      filters: appliedFilters,
      command: ffmpegCmd.slice(0, 200),
    });

    // Выполняем FFmpeg с pipe
    const { stdout } = await execAsync(ffmpegCmd, {
      encoding: null, // Получаем Buffer
      maxBuffer: 100 * 1024 * 1024, // 100MB лимит
      input: audioBuffer,
    });

    const processingTimeMs = Date.now() - start;
    logger.info("Предобработка аудио завершена", {
      processingTimeMs,
      appliedFilters,
    });

    // Извлекаем имя файла из URL для сохранения
    const urlParts = audioUrl.split("/");
    const originalFilename = urlParts[urlParts.length - 1] || "audio.wav";
    const enhancedFilename = `enhanced_${originalFilename}`;

    return {
      audioUrl, // Возвращаем исходный URL, т.к. работаем в памяти
      wasProcessed: true,
      appliedFilters,
      processingTimeMs,
      enhancedAudioBuffer: stdout as Buffer,
      enhancedAudioFilename: enhancedFilename,
    };
  } catch (error) {
    logger.error("Ошибка предобработки аудио", {
      error: error instanceof Error ? error.message : String(error),
    });
    // При ошибке возвращаем исходный URL
    return {
      audioUrl,
      wasProcessed: false,
      appliedFilters: [],
      processingTimeMs: Date.now() - start,
    };
  }
}
