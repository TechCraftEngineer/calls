/**
 * Асинхронная полная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */

import { createLogger } from "~/logger";
import { downloadAudioFile } from "~/inngest/functions/transcribe-call/audio/download";
import { startAsyncTranscription, getAsyncResult } from "~/inngest/functions/transcribe-call/gigaam/client";
import type { PreprocessResult } from "./preprocess-audio";
import type { SyncTranscriptionResult } from "./sync-transcription";

const logger = createLogger("transcribe-call:async-transcription");

export interface AsyncTranscriptionResult extends SyncTranscriptionResult {
  taskId: string;
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
  const typedStep = step as {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
    waitForEvent: <T>(id: string, options: { event: string; timeout: string; if: string }) => Promise<T | null>;
  };
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
  }>(
    "asr/wait-for-completion",
    {
      event: "giga-am/transcription.completed",
      timeout: "10m", // 10 минут максимальное ожидание
      if: `async.data.task_id == "${taskId}"`,
    },
  );

  // Шаг 3: Обрабатываем результат
  return await typedStep.run("asr/process-result", async () => {
    if (!completedEvent) {
      // Таймаут - получаем результат напрямую через polling
      logger.warn("Таймаут ожидания события, переключаемся на polling", { callId, taskId });

      const pollStartTime = Date.now();
      const result = await getAsyncResult(taskId);
      const pollTimeMs = Date.now() - pollStartTime;

      logger.info("Результат получен через polling", {
        callId,
        taskId,
        pollTimeMs,
        transcriptLength: result.transcript.length,
      });

      return {
        transcript: result.transcript,
        segments: result.segments || [],
        processingTimeMs: pollTimeMs,
        taskId,
      };
    }

    const eventData = completedEvent.data;

    if (eventData.status === "failed") {
      throw new Error(`Асинхронная транскрипция завершилась с ошибкой: ${eventData.error || "Неизвестная ошибка"}`);
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
 * Fallback: Асинхронная транскрибация с polling (если callback недоступен).
 * Использует step.sleep между проверками статуса.
 */
export async function asyncTranscriptionWithPolling(
  pipelineAudio: PreprocessResult,
  callId: string,
  step: unknown,
): Promise<AsyncTranscriptionResult> {
  const typedStep = step as {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
    sleep: (id: string, duration: string) => Promise<void>;
  };
  const { taskId } = await typedStep.run("asr/async-start", async () => {
    const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

    logger.info("Запуск асинхронной транскрибации (polling режим)", {
      callId,
      durationSeconds: pipelineAudio.durationSeconds,
    });

    return await startAsyncTranscription(buffer, filename);
  });

  // Polling цикл с step.sleep
  let attempts = 0;
  const maxAttempts = 300; // 10 минут при 2 секундах

  while (attempts < maxAttempts) {
    const status = await typedStep.run(`asr/check-status-${attempts}`, async () => {
      const { checkAsyncTaskStatus } = await import("~/inngest/functions/transcribe-call/gigaam/client");
      return await checkAsyncTaskStatus(taskId);
    });

    if (status.status === "completed") {
      const result = await typedStep.run("asr/get-result", async () => {
        const { getAsyncResult } = await import("~/inngest/functions/transcribe-call/gigaam/client");
        return await getAsyncResult(taskId);
      });

      logger.info("Асинхронная транскрипция завершена (polling)", {
        callId,
        taskId,
        attempts,
        transcriptLength: result.transcript.length,
      });

      return {
        transcript: result.transcript,
        segments: result.segments || [],
        processingTimeMs: attempts * 2000,
        taskId,
      };
    }

    if (status.status === "failed") {
      throw new Error(`Асинхронная транскрипция завершилась с ошибкой: ${status.error || "Неизвестная ошибка"}`);
    }

    // Ждём 2 секунды перед следующей проверкой
    await typedStep.sleep(`asr/sleep-${attempts}`, "2s");
    attempts++;
  }

  throw new Error(`Таймаут ожидания асинхронной транскрипции (taskId: ${taskId})`);
}
