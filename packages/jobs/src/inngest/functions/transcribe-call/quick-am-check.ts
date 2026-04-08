/**
 * Быстрая проверка на автоответчик по первым 30 секундам.
 * Используется для коротких звонков (< 2 минут) чтобы избежать
 * лишних затрат на полную транскрибацию если это автоответчик.
 */

import { shouldSkipExpensiveProcessing } from "../../../evaluation";
import { createLogger } from "../../../logger";
import { extractAudioSegment } from "./audio/processing";
import { processAudioWithoutDiarization } from "./gigaam/client";

const logger = createLogger("quick-am-check");

const QUICK_CHECK_DURATION_SECONDS = 30;

export interface QuickCheckResult {
  isAnsweringMachine: boolean;
  transcript: string;
  confidence: "high" | "medium" | "low";
  method: "llm" | "fallback";
}

/**
 * Быстрая проверка звонка на автоответчик по первым 30 секундам.
 * Использует только non-diarized ASR (быстрее и дешевле).
 *
 * @param audioBuffer - Полный аудио буфер звонка
 * @param filename - Имя файла для логирования
 * @returns Результат проверки с транскриптом и определением
 */
export async function quickAnsweringMachineCheck(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<QuickCheckResult> {
  const startTime = Date.now();

  logger.info("Начало быстрой проверки на автоответчик", {
    filename,
    checkDuration: QUICK_CHECK_DURATION_SECONDS,
    totalAudioSize: audioBuffer.byteLength,
  });

  try {
    // Шаг 1: Обрезаем первые 30 секунд
    const segmentBuffer = await extractAudioSegment(
      audioBuffer,
      0,
      QUICK_CHECK_DURATION_SECONDS,
    );

    logger.info("Аудио сегмент извлечен", {
      filename,
      segmentSize: segmentBuffer.byteLength,
      duration: QUICK_CHECK_DURATION_SECONDS,
    });

    // Шаг 2: Транскрибируем только через non-diarized ASR (быстрее)
    const asrResult = await processAudioWithoutDiarization(segmentBuffer, filename);

    const transcript = asrResult.transcript.trim();
    const asrTimeMs = Date.now() - startTime;

    logger.info("ASR быстрой проверки завершен", {
      filename,
      transcriptLength: transcript.length,
      asrTimeMs,
    });

    // Шаг 3: Проверяем на автоответчик через LLM
    const shouldSkip = await shouldSkipExpensiveProcessing(transcript);

    const totalTimeMs = Date.now() - startTime;

    // Определяем confidence на основе длины транскрипта и результата
    let confidence: "high" | "medium" | "low";
    if (transcript.length < 20) {
      confidence = "low"; // Слишком короткий текст для уверенности
    } else if (shouldSkip) {
      confidence = "high"; // Явные признаки автоответчика
    } else {
      confidence = "medium"; // Скорее всего реальный разговор
    }

    logger.info("Быстрая проверка завершена", {
      filename,
      isAnsweringMachine: shouldSkip,
      confidence,
      transcriptPreview: transcript.substring(0, 100),
      totalTimeMs,
    });

    return {
      isAnsweringMachine: shouldSkip,
      transcript,
      confidence,
      method: "llm",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Ошибка быстрой проверки", {
      filename,
      error: errorMessage,
    });

    // При ошибке считаем что это НЕ автоответчик, чтобы запустить полный pipeline
    return {
      isAnsweringMachine: false,
      transcript: "",
      confidence: "low",
      method: "fallback",
    };
  }
}

/**
 * Проверяет, нужно ли запускать быструю проверку на основе длительности звонка.
 *
 * @param durationSeconds - Длительность звонка в секундах
 * @returns true если нужна быстрая проверка
 */
export function shouldRunQuickCheck(durationSeconds: number | null | undefined): boolean {
  // Если длительность неизвестна, запускаем быструю проверку на всякий случай
  if (durationSeconds === null || durationSeconds === undefined) {
    return true;
  }

  // Быстрая проверка для звонков менее 2 минут (120 секунд)
  return durationSeconds < 120;
}
