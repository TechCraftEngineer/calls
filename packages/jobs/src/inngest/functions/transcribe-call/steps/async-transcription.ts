/**
 * Асинхронная полная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */

import { createLogger } from "../../../../logger";
import { downloadAudioFileCached } from "../audio/download";
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
  const { taskId, startTime } = (await step.run("asr/async-start", async () => {
    const { buffer, filename } = await downloadAudioFileCached(pipelineAudio.preprocessedFileId);

    logger.info("Запуск асинхронной полной транскрибации", {
      callId,
      durationSeconds: pipelineAudio.durationSeconds,
    });

    const result = await startAsyncTranscription(buffer, filename);

    logger.info("Асинхронная транскрибация запущена", {
      callId,
      taskId: result.taskId,
    });

    // Захватываем startTime внутри step для корректности при replay
    return { ...result, startTime: Date.now() };
  })) as { taskId: string; startTime: number };

  // Шаг 2: Ожидаем событие завершения от GigaAM сервиса
  const completedEvent = (await step.waitForEvent("asr/wait-for-completion", {
    event: "giga-am/transcription.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == "${taskId}"`,
  })) as {
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
        }>;
      };
      error?: string;
    };
  } | null;

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
            segments: directResult.segments ?? [],
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
      segments: eventData.result.segments || [],
      processingTimeMs: Date.now() - startTime,
      taskId,
    };
  })) as AsyncTranscriptionResult;
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
  const { taskId, startTime } = (await step.run("asr/async-diarized-start", async () => {
    const { buffer, filename } = await downloadAudioFileCached(pipelineAudio.preprocessedFileId);

    logger.info("Запуск асинхронной диаризированной транскрибации", {
      callId,
      durationSeconds: pipelineAudio.durationSeconds,
    });

    const diarizationSegments = segments.map((s) => ({
      start: s.start,
      end: s.end,
      speaker: s.speaker || "UNKNOWN",
    }));

    const result = await startAsyncDiarizedTranscription(buffer, filename, diarizationSegments);

    logger.info("Асинхронная диаризированная транскрибация запущена", {
      callId,
      taskId: result.taskId,
    });

    // Захватываем startTime внутри step для корректности при replay
    return { ...result, startTime: Date.now() };
  })) as { taskId: string; startTime: number };

  // Шаг 2: Ожидаем событие завершения от GigaAM сервиса
  const completedEvent = (await step.waitForEvent("asr/wait-for-diarized-completion", {
    event: "giga-am/transcription.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == "${taskId}"`,
  })) as {
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
  } | null;

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
            segments: directResult.segments ?? [],
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

    // Преобразуем сегменты в нужный формат
    const rawSegments = (eventData.result.segments || []).map((s) => ({
      speaker: s.speaker ?? "UNKNOWN",
      start: s.start,
      end: s.end,
      text: s.text,
      confidence: s.confidence,
    }));

    // Объединяем последовательные сегменты одного спикера
    const mergedSegments = mergeConsecutiveSpeakerSegments(rawSegments, callId);

    return {
      transcript: eventData.result.final_transcript,
      segments: mergedSegments,
      processingTimeMs: Date.now() - startTime,
      taskId,
      diarizationSuccess: true,
      diarizationFailed: false,
    };
  })) as AsyncTranscriptionResult;
}
