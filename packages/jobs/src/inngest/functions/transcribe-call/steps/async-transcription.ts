/**
 * Асинхронная полная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */

import { createLogger } from "../../../../logger";
import { downloadAudioFile } from "../audio/download";
import {
  getAsyncResult,
  startAsyncDiarizedTranscription,
  startAsyncTranscription,
} from "../gigaam/client";
import { mergeConsecutiveSpeakerSegments } from "./merge-consecutive-segments";
import type { PreprocessResult } from "./preprocess-audio";
import type { StepRunner } from "./step-runner";
import type { SyncTranscriptionResult } from "./sync-transcription";

const logger = createLogger("transcribe-call:async-transcription");

/**
 * Экранирует строку для использования в CEL (Common Expression Language) выражении.
 * CEL строковые литералы используют одинарные кавычки.
 * Необходимо экранировать: \ -> \\\\ и ' -> \\'
 */
function escapeForCel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Нормализует сегменты для обеспечения обязательных полей (speaker, start, end).
 * Гарантирует что результат соответствует SyncTranscriptionResult.segments.
 */
function normalizeSegments(
  segments: Array<{
    text: string;
    speaker?: string;
    start?: number;
    end?: number;
    confidence?: number;
  }> | undefined,
): Array<{ speaker: string; start: number; end: number; text: string }> {
  if (!segments || segments.length === 0) {
    return [];
  }

  return segments.map((s, index) => ({
    speaker: s.speaker || "UNKNOWN",
    start: s.start ?? index, // fallback на индекс если нет времени
    end: s.end ?? (s.start ?? index) + 1, // fallback если нет времени окончания
    text: s.text,
  }));
}

export interface AsyncTranscriptionResult extends SyncTranscriptionResult {
  taskId: string;
  diarizationSuccess?: boolean;
  diarizationFailed?: boolean;
}

/**
 * Запускает асинхронную транскрибацию и ожидает результат через Inngest событие.
 * Использует callback-модель: Python сервис отправляет событие при завершении.
 */
export async function asyncTranscriptionWithCallback(
  pipelineAudio: PreprocessResult,
  callId: string,
  step: StepRunner,
): Promise<AsyncTranscriptionResult> {
  // Шаг 1: Запускаем асинхронную транскрибацию
  const startResult = await step.run("asr/async-start", async () => {
    const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

    logger.info("Запуск асинхронной полной транскрибации", {
      callId,
      durationSeconds: pipelineAudio.durationSeconds,
    });

    const result = await startAsyncTranscription(buffer, filename);

    logger.info("Асинхронная транскрибация запущена", {
      callId,
      taskId: result.taskId,
    });

    return result;
  });
  const { taskId } = startResult;

  // Type definition для события завершения транскрипции
  // Поля speaker/start/end опциональны для non-diarized результатов (как в NonDiarizedTranscriptionResultSchema)
  type CompletedEvent = {
    data: {
      task_id: string;
      status: "completed" | "failed";
      result?: {
        final_transcript?: string;
        segments?: Array<{
          text: string;
          speaker?: string;
          start?: number;
          end?: number;
          confidence?: number;
        }>;
        processing_time?: number;
      };
      error?: string;
    };
  };

  // Шаг 2: Ожидаем событие завершения от GigaAM сервиса
  const completedEvent = await step.waitForEvent<CompletedEvent>("asr/wait-for-completion", {
    event: "giga-am/transcription.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == '${escapeForCel(taskId)}'`,
  });

  // Шаг 3: Обрабатываем результат
  return (await step.run("asr/process-result", async () => {
    if (!completedEvent) {
      // Таймаут waitForEvent - пробуем получить результат напрямую
      logger.warn(
        "Таймаут ожидания события завершения транскрипции, пробуем получить результат напрямую",
        {
          callId,
          taskId,
        },
      );

      try {
        const directResult = await getAsyncResult(taskId);
        if (directResult.transcript) {
          logger.info("Транскрипция получена напрямую после таймаута события", {
            callId,
            taskId,
            transcriptLength: directResult.transcript.length,
          });

          return {
            transcript: directResult.transcript,
            segments: normalizeSegments(directResult.segments),
            processingTimeMs: directResult.processingTimeMs ?? 0,
            taskId,
          };
        }
      } catch (fetchError) {
        logger.error("Не удалось получить результат транскрипции напрямую", {
          callId,
          taskId,
          error: fetchError,
        });
      }

      throw new Error(
        `Таймаут ожидания события завершения транскрипции (taskId: ${taskId}). ` +
          `Событие giga-am/transcription.completed не получено в течение 60 минут и прямой запрос также не вернул результата.`,
      );
    }

    const eventData = completedEvent.data;
    if (!eventData) {
      throw new Error("Событие завершения не содержит данных");
    }

    if (eventData.status === "failed") {
      throw new Error(
        `Асинхронная транскрипция завершилась с ошибкой: ${eventData.error || "Неизвестная ошибка"}`,
      );
    }

    if (!eventData.result?.final_transcript) {
      throw new Error("GigaAM вернул completed статус без транскрипции");
    }

    logger.info("Асинхронная транскрибация завершена через callback", {
      callId,
      taskId,
      transcriptLength: eventData.result.final_transcript.length,
    });

    return {
      transcript: eventData.result.final_transcript,
      segments: normalizeSegments(eventData.result.segments),
      // Используем processing_time из события GigaAM вместо Date.now() - startTime
      // для корректного измерения времени обработки при replay Inngest
      // GigaAM возвращает processing_time в секундах, конвертируем в миллисекунды
      processingTimeMs: (eventData.result.processing_time ?? 0) * 1000,
      taskId,
    };
  }));
}

/**
 * Асинхронная диаризированная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */
export async function asyncDiarizedTranscriptionWithCallback(
  pipelineAudio: PreprocessResult,
  callId: string,
  segments: Array<{ speaker: string; start: number; end: number; text: string }>,
  step: StepRunner,
): Promise<AsyncTranscriptionResult> {
  // Шаг 1: Запускаем асинхронную диаризированную транскрибацию
  const startResult = (await step.run("asr/async-diarized-start", async () => {
    const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

    logger.info("Запуск асинхронной диаризированной транскрибации", {
      callId,
      durationSeconds: pipelineAudio.durationSeconds,
    });

    const diarizationSegments = segments.map(
      (s: { speaker: string; start: number; end: number; text: string }) => ({
        start: s.start,
        end: s.end,
        speaker: s.speaker || "UNKNOWN",
      }),
    );

    const result = await startAsyncDiarizedTranscription(buffer, filename, diarizationSegments);

    logger.info("Асинхронная диаризированная транскрибация запущена", {
      callId,
      taskId: result.taskId,
    });

    return result;
  }));
  const { taskId } = startResult;

  // Type definition для события завершения диаризированной транскрипции
  type DiarizedCompletedEvent = {
    data: {
      task_id: string;
      status: "completed" | "failed";
      result?: {
        final_transcript?: string;
        segments?: Array<{
          speaker: string;
          start: number;
          end: number;
          text: string;
          confidence: number;
        }>;
        num_speakers?: number;
        speakers?: string[];
        processing_time?: number;
      };
      error?: string;
    };
  };

  // Шаг 2: Ожидаем событие завершения от GigaAM сервиса
  const completedEvent = await step.waitForEvent<DiarizedCompletedEvent>("asr/wait-for-diarized-completion", {
    event: "giga-am/transcription.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == '${escapeForCel(taskId)}'`,
  });

  // Шаг 3: Обрабатываем результат
  return (await step.run("asr/process-diarized-result", async () => {
    if (!completedEvent) {
      // Таймаут waitForEvent - пробуем получить результат напрямую (как в asyncTranscriptionWithCallback)
      logger.warn(
        "Таймаут ожидания события завершения диаризации, пробуем получить результат напрямую",
        {
          callId,
          taskId,
        },
      );

      try {
        const directResult = await getAsyncResult(taskId);
        if (directResult.transcript) {
          logger.info("Диаризированная транскрипция получена напрямую после таймаута события", {
            callId,
            taskId,
            transcriptLength: directResult.transcript.length,
          });

          return {
            transcript: directResult.transcript,
            segments: normalizeSegments(directResult.segments),
            processingTimeMs: directResult.processingTimeMs ?? 0,
            taskId,
            diarizationSuccess: true,
            diarizationFailed: false,
          };
        }
      } catch (fetchError) {
        logger.error("Не удалось получить диаризированную транскрипцию напрямую", {
          callId,
          taskId,
          error: fetchError,
        });
      }

      throw new Error(
        `Таймаут ожидания события завершения диаризации (taskId: ${taskId}). ` +
          `Событие giga-am/transcription.completed не получено в течение 60 минут и прямой запрос также не вернул результата.`,
      );
    }

    const eventData = completedEvent.data;
    if (!eventData) {
      throw new Error("Событие завершения не содержит данных");
    }

    if (eventData.status === "failed") {
      throw new Error(
        `Асинхронная диаризированная транскрипция завершилась с ошибкой: ${eventData.error || "Неизвестная ошибка"}`,
      );
    }

    if (!eventData.result?.final_transcript) {
      throw new Error("GigaAM вернул completed статус без транскрипции");
    }

    if (!eventData.result.segments || eventData.result.segments.length === 0) {
      throw new Error("GigaAM вернул completed статус без сегментов диаризации");
    }

    logger.info("Асинхронная диаризированная транскрибация завершена через callback", {
      callId,
      taskId,
      transcriptLength: eventData.result.final_transcript.length,
      segmentsCount: eventData.result.segments?.length ?? 0,
    });

    // Нормализуем сегменты с обеспечением обязательных полей для mergeConsecutiveSpeakerSegments
    const normalizedSegments = normalizeSegments(eventData.result.segments);

    // Объединяем последовательные сегменты одного спикера
    const mergedSegments = mergeConsecutiveSpeakerSegments(normalizedSegments, callId);

    return {
      transcript: eventData.result.final_transcript,
      segments: mergedSegments,
      // Используем processing_time из события GigaAM вместо Date.now() - startTime
      // для корректного измерения времени обработки при replay Inngest
      // GigaAM возвращает processing_time в секундах, конвертируем в миллисекунды
      processingTimeMs: (eventData.result.processing_time ?? 0) * 1000,
      taskId,
      diarizationSuccess: true,
      diarizationFailed: false,
    };
  }));
}
