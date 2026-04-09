/**
 * Асинхронная полная транскрибация через GigaAM API с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */

import { downloadAudioFile } from "~/inngest/functions/transcribe-call/audio/download";
import {
  getAsyncResult,
  startAsyncTranscription,
} from "~/inngest/functions/transcribe-call/gigaam/client";
import { createLogger } from "~/logger";
import type { PreprocessResult } from "./preprocess-audio";
import type { StepRunner, StepRunnerWithSleep } from "./step-runner";
import type { SyncTranscriptionResult } from "./sync-transcription";

const logger = createLogger("transcribe-call:async-transcription");

// Конфигурация polling при таймауте waitForEvent
const POLLING_CONFIG = {
  maxPollingTimeoutMs: 5 * 60 * 1000, // 5 минут максимальное время polling
  pollIntervalMs: 3000, // 3 секунды между попытками
};

export interface AsyncTranscriptionResult extends SyncTranscriptionResult {
  taskId: string;
  diarizationSuccess?: boolean;
  diarizationFailed?: boolean;
}

/**
 * Helper функция для polling с retry loop
 */
async function pollWithRetry<T>(
  taskId: string,
  callId: string,
  pollFn: () => Promise<T>,
  validateFn: (result: T) => boolean,
  context: string,
): Promise<{ result: T; pollTimeMs: number }> {
  const startTime = Date.now();
  let attempts = 0;

  while (true) {
    attempts++;
    const elapsedMs = Date.now() - startTime;

    if (elapsedMs >= POLLING_CONFIG.maxPollingTimeoutMs) {
      throw new Error(
        `${context}: Превышен максимальный таймаут polling (${POLLING_CONFIG.maxPollingTimeoutMs}ms) после ${attempts} попыток`,
      );
    }

    try {
      logger.info(`${context}: Попытка ${attempts} получения результата`, {
        callId,
        taskId,
        elapsedMs: Math.round(elapsedMs / 1000),
      });

      const result = await pollFn();

      if (validateFn(result)) {
        const pollTimeMs = Date.now() - startTime;
        logger.info(`${context}: Результат успешно получен`, {
          callId,
          taskId,
          attempts,
          pollTimeMs,
        });
        return { result, pollTimeMs };
      }

      logger.warn(`${context}: Результат ещё не готов, повторная попытка`, {
        callId,
        taskId,
        attempts,
      });
    } catch (error) {
      logger.warn(`${context}: Ошибка при получении результата, повторная попытка`, {
        callId,
        taskId,
        attempts,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Задержка перед следующей попыткой
    await new Promise((resolve) => setTimeout(resolve, POLLING_CONFIG.pollIntervalMs));
  }
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
    timeout: "10m", // 10 минут максимальное ожидание
    if: `async.data.task_id == "${taskId}"`,
  });

  // Шаг 3: Обрабатываем результат
  return await typedStep.run("asr/process-result", async () => {
    if (!completedEvent) {
      // Таймаут - получаем результат напрямую через polling с retry
      logger.warn("Таймаут ожидания события, переключаемся на polling с retry", { callId, taskId });

      const { result, pollTimeMs } = await pollWithRetry(
        taskId,
        callId,
        () => getAsyncResult(taskId),
        (result) => !!(result.transcript && result.transcript.length > 0),
        "AsyncTranscription",
      );

      logger.info("Результат получен через polling", {
        callId,
        taskId,
        pollTimeMs,
        transcriptLength: result.transcript.length,
        segmentsCount: result.segments?.length ?? 0,
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
    const { downloadAudioFile } = await import(
      "~/inngest/functions/transcribe-call/audio/download"
    );
    const { startAsyncDiarizedTranscription } = await import(
      "~/inngest/functions/transcribe-call/gigaam/client"
    );
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
    timeout: "15m", // 15 минут максимальное ожидание (диаризация дольше)
    if: `async.data.task_id == "${taskId}"`,
  });

  // Шаг 3: Обрабатываем результат
  return await typedStep.run("asr/process-diarized-result", async () => {
    if (!completedEvent) {
      // Таймаут - получаем результат напрямую через polling с retry
      logger.warn("Таймаут ожидания события диаризации, переключаемся на polling с retry", {
        callId,
        taskId,
      });

      const { getAsyncDiarizedResult } = await import(
        "~/inngest/functions/transcribe-call/gigaam/client"
      );

      const { result, pollTimeMs } = await pollWithRetry(
        taskId,
        callId,
        () => getAsyncDiarizedResult(taskId),
        (result) =>
          !!(
            result.final_transcript &&
            result.final_transcript.length > 0 &&
            result.segments &&
            result.segments.length > 0
          ),
        "AsyncDiarizedTranscription",
      );

      logger.info("Результат диаризации получен через polling", {
        callId,
        taskId,
        pollTimeMs,
        transcriptLength: result.final_transcript.length,
        segmentsCount: result.segments.length,
      });

      return {
        transcript: result.final_transcript,
        segments: result.segments.map((s) => ({
          speaker: s.speaker ?? "UNKNOWN",
          start: s.start,
          end: s.end,
          text: s.text,
          confidence: s.confidence,
        })),
        processingTimeMs: pollTimeMs,
        taskId,
        diarizationSuccess: true,
        diarizationFailed: false,
      };
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

    return {
      transcript: eventData.result.final_transcript,
      segments: (eventData.result.segments || []).map((s) => ({
        speaker: s.speaker ?? "UNKNOWN",
        start: s.start,
        end: s.end,
        text: s.text,
        confidence: s.confidence,
      })),
      processingTimeMs: 0, // Неизвестно при callback-модели
      taskId,
      diarizationSuccess: true,
      diarizationFailed: false,
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
  const typedStep = step as StepRunnerWithSleep;
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
      const { checkAsyncTaskStatus } = await import(
        "~/inngest/functions/transcribe-call/gigaam/client"
      );
      return await checkAsyncTaskStatus(taskId);
    });

    if (status.status === "completed") {
      const result = await typedStep.run("asr/get-result", async () => {
        const { getAsyncResult } = await import(
          "~/inngest/functions/transcribe-call/gigaam/client"
        );
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
      throw new Error(
        `Асинхронная транскрипция завершилась с ошибкой: ${status.error || "Неизвестная ошибка"}`,
      );
    }

    // Ждём 2 секунды перед следующей проверкой
    await typedStep.sleep(`asr/sleep-${attempts}`, "2s");
    attempts++;
  }

  throw new Error(`Таймаут ожидания асинхронной транскрипции (taskId: ${taskId})`);
}
