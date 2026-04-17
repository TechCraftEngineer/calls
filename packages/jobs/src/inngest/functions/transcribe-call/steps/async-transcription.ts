/**
 * Асинхронная полная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */

import { createLogger } from "../../../../logger";
import { downloadAudioFile } from "../audio/download";
import { getAsyncResult, startAsyncTranscription } from "../gigaam/client";
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
  step: unknown,
): Promise<AsyncTranscriptionResult> {
  const typedStep = step as StepRunner;
  // Шаг 1: Запускаем асинхронную транскрибацию
  const { taskId } = await typedStep.run("asr/async-start", async () => {
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

  // Шаг 2: Ожидаем событие завершения от GigaAM сервиса
  const completedEvent = await typedStep.waitForEvent<{
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
  }>("asr/wait-for-completion", {
    event: "giga-am/transcription.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == "${taskId}"`,
  });

  // Шаг 3: Обрабатываем результат
  return await typedStep.run("asr/process-result", async () => {
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
      processingTimeMs: 0, // Неизвестно при callback-модели
      taskId,
    };
  });
}

/**
 * Асинхронная диаризированная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */
export async function asyncDiarizedTranscriptionWithCallback(
  pipelineAudio: PreprocessResult,
  callId: string,
  segments: Array<{ speaker: string; start: number; end: number; text: string }>,
  step: unknown,
): Promise<AsyncTranscriptionResult> {
  const typedStep = step as StepRunner;

  // Шаг 1: Запускаем асинхронную диаризированную транскрибацию
  const { taskId } = await typedStep.run("asr/async-diarized-start", async () => {
    const { downloadAudioFile } = await import("../audio/download");
    const { startAsyncDiarizedTranscription } = await import("../gigaam/client");
    const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

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

    return result;
  });

  // Шаг 2: Ожидаем событие завершения от GigaAM сервиса
  const completedEvent = await typedStep.waitForEvent<{
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
  }>("asr/wait-for-diarized-completion", {
    event: "giga-am/transcription.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == "${taskId}"`,
  });

  // Шаг 3: Обрабатываем результат
  return await typedStep.run("asr/process-diarized-result", async () => {
    if (!completedEvent) {
      // Таймаут waitForEvent - выбрасываем ошибку (polling не используем)
      throw new Error(
        `Таймаут ожидания события завершения диаризации (taskId: ${taskId}). ` +
          `Событие giga-am/transcription.completed не получено в течение 60 минут.`,
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
    const { mergeConsecutiveSpeakerSegments } = await import("./merge-consecutive-segments");
    const mergedSegments = mergeConsecutiveSpeakerSegments(rawSegments, callId);

    return {
      transcript: eventData.result.final_transcript,
      segments: mergedSegments,
      processingTimeMs: 0, // Неизвестно при callback-модели
      taskId,
      diarizationSuccess: true,
      diarizationFailed: false,
    };
  });
}
