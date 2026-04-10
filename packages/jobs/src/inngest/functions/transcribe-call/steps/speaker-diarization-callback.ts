/**
 * Асинхронная диаризация через Speaker Embeddings Service с callback-моделью.
 * Запускает задачу и ждёт событие завершения через step.waitForEvent.
 */

import { createLogger } from "../../../../logger";
import { downloadAudioFile } from "../audio/download";
import { shouldUseSpeakerEmbeddings, startSpeakerDiarization } from "../speakers/diarization";
import type { PreprocessResult } from "./preprocess-audio";
import type { StepRunner } from "./step-runner";

const logger = createLogger("transcribe-call:speaker-diarization-callback");

export interface SpeakerDiarizationCallbackResult {
  success: boolean;
  mapping?: Record<string, string>;
  usedEmbeddings?: boolean;
  clusterCount?: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
  taskId?: string;
  processingTimeMs: number;
  segments?: Array<{ start: number; end: number; speaker: string }>;
}

/**
 * Запускает асинхронную диаризацию через Speaker Embeddings и ожидает результат через Inngest событие.
 * Использует callback-модель: Python сервис отправляет событие при завершении.
 */
export async function speakerDiarizationWithCallback(
  pipelineAudio: PreprocessResult,
  callId: string,
  fullTranscriptionSegments: Array<{ speaker: string; start: number; end: number; text: string }>,
  step: unknown,
): Promise<SpeakerDiarizationCallbackResult> {
  const typedStep = step as StepRunner;
  // Проверяем, стоит ли использовать speaker embeddings
  const durationSeconds = pipelineAudio.durationSeconds ?? 0;
  const shouldUse = shouldUseSpeakerEmbeddings(durationSeconds, fullTranscriptionSegments.length);

  if (!shouldUse) {
    logger.info("Пропускаем speaker embeddings диаризацию (короткий звонок или мало сегментов)", {
      callId,
      durationSeconds,
      segmentCount: fullTranscriptionSegments.length,
    });

    return {
      success: false,
      skipped: true,
      skipReason: "Звонок слишком короткий или слишком мало сегментов для диаризации",
      processingTimeMs: 0,
    };
  }

  // Шаг 1: Запускаем асинхронную диаризацию
  const { taskId, success, error } = await typedStep.run(
    "speaker-embeddings/async-start",
    async () => {
      const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

      logger.info("Запуск асинхронной диаризации через Speaker Embeddings", {
        callId,
        durationSeconds,
        segmentCount: fullTranscriptionSegments.length,
      });

      const result = await startSpeakerDiarization(callId, buffer, filename, {
        // Определяем примерное количество спикеров на основе сегментов
        minSpeakers: 2,
        maxSpeakers: Math.min(4, Math.ceil(fullTranscriptionSegments.length / 3)),
      });

      if (!result.success || !result.taskId) {
        logger.error("Не удалось запустить диаризацию", { callId, error: result.error });
        return { success: false, error: result.error || "Failed to start diarization" };
      }

      logger.info("Диаризация через Speaker Embeddings запущена", {
        callId,
        taskId: result.taskId,
      });

      return { success: true, taskId: result.taskId };
    },
  );

  if (!success || !taskId) {
    return {
      success: false,
      error: error || "Failed to start diarization",
      processingTimeMs: 0,
    };
  }

  // Шаг 2: Ожидаем событие завершения от Speaker Embeddings сервиса
  const completedEvent = await typedStep.waitForEvent<{
    data: {
      task_id: string;
      status: "completed" | "failed";
      result?: {
        success?: boolean;
        mapping?: Record<string, string>;
        usedEmbeddings?: boolean;
        clusterCount?: number;
        reason?: string;
        error?: string;
        segments?: Array<{ start: number; end: number; speaker: string }>;
      };
      error?: string;
      processingTimeMs?: number;
    };
  }>("speaker-embeddings/wait-for-completion", {
    event: "speaker-embeddings/diarization.completed",
    timeout: "30m", // 10 минут максимальное ожидание
    if: `async.data.task_id == "${taskId}"`,
  });

  // Шаг 3: Обрабатываем результат
  return await typedStep.run("speaker-embeddings/process-result", async () => {
    if (!completedEvent) {
      logger.warn("Таймаут ожидания события диаризации", { callId, taskId });
      return {
        success: false,
        error: "Timeout waiting for diarization event",
        taskId,
        processingTimeMs: 0,
      };
    }

    const eventData = completedEvent.data;

    if (eventData.status === "failed") {
      logger.error("Диаризация завершилась с ошибкой", {
        callId,
        taskId,
        error: eventData.error,
      });
      return {
        success: false,
        error: eventData.error || "Diarization failed",
        taskId,
        processingTimeMs: eventData.processingTimeMs || 0,
      };
    }

    if (!eventData.result?.success) {
      logger.error("Диаризация вернула неуспешный результат", {
        callId,
        taskId,
        result: eventData.result,
      });
      return {
        success: false,
        error: eventData.result?.reason || "Диаризация вернула неуспешный результат",
        taskId,
        processingTimeMs: eventData.processingTimeMs || 0,
      };
    }

    logger.info("Диаризация через Speaker Embeddings завершена", {
      callId,
      taskId,
      mapping: eventData.result.mapping,
      usedEmbeddings: eventData.result.usedEmbeddings,
      clusterCount: eventData.result.clusterCount,
    });

    return {
      success: true,
      mapping: eventData.result.mapping,
      usedEmbeddings: eventData.result.usedEmbeddings,
      clusterCount: eventData.result.clusterCount,
      taskId,
      processingTimeMs: eventData.processingTimeMs || 0,
      segments: eventData.result.segments,
    };
  });
}
