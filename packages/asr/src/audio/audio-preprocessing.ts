/**
 * Предобработка аудио перед отправкой в ASR.
 * Улучшает качество распознавания через нормализацию громкости,
 * шумоподавление и оптимизацию формата.
 * Работает полностью в памяти без временных файлов.
 */

import { exec, spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { env } from "@calls/config";
import { createLogger } from "@calls/logger";
import { enhanceAudioWithPython } from "./audio-enhancer-client";

const execAsync = promisify(exec);
const logger = createLogger("asr-audio-preprocessing");

/** Таймаут скачивания исходного аудио (медленный источник не должен висеть бесконечно) */
const DEFAULT_AUDIO_DOWNLOAD_TIMEOUT_MS = 120_000;

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
  removeSilence?: boolean;
  /** Использовать Python микросервис для продвинутой обработки (ML-based) */
  usePythonEnhancer?: boolean;
  /** Таймаут загрузки аудио по URL (мс) */
  downloadTimeoutMs?: number;
}

export interface PreprocessingResult {
  /**
   * Исходный URL входного файла (без изменений).
   * Для распознавания по улучшенному файлу см. загрузку временного URL в pipeline.
   */
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
 * Для логов: только host и имя файла из пути, без query/fragment (подписи URL не попадают в логи).
 */
export function safeAudioUrlParts(urlString: string): {
  host: string;
  basename: string;
} {
  try {
    const u = new URL(urlString);
    const segments = u.pathname.split("/").filter(Boolean);
    const basename = segments.at(-1) ?? "(no path)";
    return { host: u.host, basename };
  } catch {
    return { host: "(invalid-url)", basename: "(invalid-url)" };
  }
}

async function fetchAudioBuffer(audioUrl: string, timeoutMs: number): Promise<Buffer> {
  const response = await fetch(audioUrl, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Не удалось скачать аудио: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
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
  if (options.removeSilence) {
    // Удаляет тишину длиннее 1 секунды
    filters.push(
      "silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB:detection=peak,silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB:detection=peak",
    );
  }

  return filters;
}

function runFfmpegWithBuffer(args: string[], inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg завершился с кодом ${code}: ${stderr.slice(0, 2000)}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    const stdin = child.stdin;
    if (!stdin) {
      reject(new Error("FFmpeg: stdin недоступен"));
      return;
    }

    stdin.on("error", reject);
    void pipeline(Readable.from(inputBuffer), stdin).catch(reject);
  });
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
  const downloadTimeoutMs = options.downloadTimeoutMs ?? DEFAULT_AUDIO_DOWNLOAD_TIMEOUT_MS;

  // Настройки по умолчанию (оптимальные для ASR)
  const config: Required<Omit<PreprocessingOptions, "downloadTimeoutMs">> & {
    downloadTimeoutMs: number;
  } = {
    normalizeVolume: options.normalizeVolume ?? true,
    noiseReduction: options.noiseReduction ?? false,
    targetSampleRate: options.targetSampleRate ?? 16000,
    convertToMono: options.convertToMono ?? true,
    enhanceSpeech: options.enhanceSpeech ?? true,
    removeSilence: options.removeSilence ?? false,
    usePythonEnhancer: options.usePythonEnhancer ?? true,
    downloadTimeoutMs,
  };

  let downloadedBuffer: Buffer | undefined;

  // Приоритет 1: Пытаемся использовать Python ML сервис (если доступен и включен)
  if (config.usePythonEnhancer && env.AUDIO_ENHANCER_ENABLED) {
    logger.info("Попытка использовать Python ML сервис для обработки аудио");

    try {
      downloadedBuffer = await fetchAudioBuffer(audioUrl, downloadTimeoutMs);

      const result = await enhanceAudioWithPython(downloadedBuffer, {
        noiseReduction: config.noiseReduction,
        normalizeVolume: config.normalizeVolume,
        enhanceSpeech: config.enhanceSpeech,
        removeSilence: config.removeSilence,
        targetSampleRate: config.targetSampleRate,
      });

      if (result.wasProcessed) {
        appliedFilters.push("python-ml-enhancer");
        if (config.noiseReduction) appliedFilters.push("ml-noise-reduction");
        if (config.normalizeVolume) appliedFilters.push("ml-normalize");
        if (config.enhanceSpeech) appliedFilters.push("ml-speech-enhance");
        if (config.removeSilence) appliedFilters.push("silero-vad");

        logger.info("Python ML обработка успешна", {
          appliedFilters,
          processingTimeMs: result.processingTimeMs,
        });

        const urlParts = audioUrl.split("/");
        const originalFilename = urlParts[urlParts.length - 1] || "audio.wav";
        const enhancedFilename = `enhanced_${originalFilename}`;

        return {
          audioUrl,
          wasProcessed: true,
          appliedFilters,
          processingTimeMs: result.processingTimeMs,
          enhancedAudioBuffer: result.audioBuffer,
          enhancedAudioFilename: enhancedFilename,
        };
      }

      logger.info("Python сервис недоступен, используем FFmpeg fallback");
    } catch (error) {
      logger.warn("Ошибка Python обработки, используем FFmpeg fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (config.usePythonEnhancer && !env.AUDIO_ENHANCER_ENABLED) {
    logger.info("Python ML сервис отключен через AUDIO_ENHANCER_ENABLED=false, используем FFmpeg");
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
    const safe = safeAudioUrlParts(audioUrl);
    logger.info("Скачивание аудио для предобработки", {
      host: safe.host,
      basename: safe.basename,
    });

    if (!downloadedBuffer) {
      downloadedBuffer = await fetchAudioBuffer(audioUrl, downloadTimeoutMs);
    }
    const audioBuffer = downloadedBuffer;

    const filters = buildFFmpegFilters(config);

    const ffmpegArgs = ["-i", "pipe:0", "-y"];
    if (filters.length > 0) {
      ffmpegArgs.push("-af", filters.join(","));
      appliedFilters.push(...filters);
    }
    if (config.convertToMono) {
      ffmpegArgs.push("-ac", "1");
      appliedFilters.push("mono");
    }
    ffmpegArgs.push("-ar", String(config.targetSampleRate));
    appliedFilters.push(`${config.targetSampleRate}Hz`);
    ffmpegArgs.push("-acodec", "pcm_s16le", "-f", "wav", "pipe:1");

    logger.info("Запуск FFmpeg предобработки", {
      filters: appliedFilters,
      argsSample: ffmpegArgs.slice(0, 12),
    });

    const stdout = await runFfmpegWithBuffer(ffmpegArgs, audioBuffer);

    const processingTimeMs = Date.now() - start;
    logger.info("Предобработка аудио завершена", {
      processingTimeMs,
      appliedFilters,
    });

    const urlParts = audioUrl.split("/");
    const originalFilename = urlParts[urlParts.length - 1] || "audio.wav";
    const enhancedFilename = `enhanced_${originalFilename}`;

    return {
      audioUrl,
      wasProcessed: true,
      appliedFilters,
      processingTimeMs,
      enhancedAudioBuffer: stdout,
      enhancedAudioFilename: enhancedFilename,
    };
  } catch (error) {
    logger.error("Ошибка предобработки аудио", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      audioUrl,
      wasProcessed: false,
      appliedFilters: [],
      processingTimeMs: Date.now() - start,
    };
  }
}
