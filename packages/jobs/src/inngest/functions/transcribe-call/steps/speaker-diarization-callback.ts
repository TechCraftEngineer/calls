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

/**
 * Экранирует строку для использования в CEL (Common Expression Language) выражении.
 * CEL строковые литералы используют одинарные кавычки.
 * Необходимо экранировать: \ -> \\\\ и ' -> \\'
 */
function escapeForCel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

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
  step: StepRunner,
): Promise<SpeakerDiarizationCallbackResult> {
  // Защита от undefined step (проблема с бандлингом)
  if (!step || typeof step.run !== "function") {
    throw new Error(
      `Invalid step parameter in speakerDiarizationWithCallback: ${typeof step}. ` +
        `step.run is ${typeof step?.run}. ` +
        `This may indicate a bundling issue or incorrect function call.`
    );
  }

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
  const startResult = (await step.run("speaker-embeddings/async-start", async () => {
    const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

    // Определяем примерное количество спикеров на основе сегментов
    const minSpeakers = 2;
    const calculatedMax = Math.min(4, Math.ceil(fullTranscriptionSegments.length / 3));
    const maxSpeakers = Math.max(minSpeakers, calculatedMax);

    logger.info("Запуск асинхронной диаризации через Speaker Embeddings", {
      callId,
      durationSeconds,
      segmentCount: fullTranscriptionSegments.length,
      minSpeakers,
      maxSpeakers,
    });

    const result = await startSpeakerDiarization(callId, buffer, filename, {
      minSpeakers,
      maxSpeakers,
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
  }));
  const { taskId, success, error } = startResult;

  if (!success || !taskId) {
    return {
      success: false,
      error: error || "Failed to start diarization",
      processingTimeMs: 0,
    };
  }

  // Type definition для события завершения диаризации
  // Синхронизировано с SpeakerEmbeddingsCallbackData из embeddings-handler.ts
  type SpeakerEmbeddingCompletedEvent = {
    data: {
      task_id: string;
      call_id: string;
      status: "completed" | "failed";
      result?: {
        success?: boolean;
        mapping?: Record<string, string>;
        usedEmbeddings?: boolean;
        clusterCount?: number;
        reason?: string;
        error?: string;
        segments?: Array<{ start: number; end: number; speaker: string }>;
        processingTimeMs?: number; // processingTimeMs внутри result если есть
      };
      error?: string;
    };
  };

  // Шаг 2: Ожидаем событие завершения от Speaker Embeddings сервиса
  const completedEvent = await step.waitForEvent<SpeakerEmbeddingCompletedEvent>("speaker-embeddings/wait-for-completion", {
    event: "speaker-embeddings/diarization.completed",
    timeout: "60m", // 60 минут максимальное ожидание
    if: `async.data.task_id == '${escapeForCel(taskId)}'`,
  });

  // Шаг 3: Обрабатываем результат
  return (await step.run("speaker-embeddings/process-result", async () => {
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
    if (!eventData) {
      throw new Error("Событие завершения не содержит данных");
    }

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
        processingTimeMs: eventData.result?.processingTimeMs || 0,
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
        processingTimeMs: eventData.result?.processingTimeMs || 0,
      };
    }

    logger.info("Диаризация через Speaker Embeddings завершена", {
      callId,
      taskId,
      mapping: eventData.result.mapping,
      usedEmbeddings: eventData.result.usedEmbeddings,
      clusterCount: eventData.result.clusterCount,
    });

    // Сегменты из speaker embeddings передаются в GigaAM без объединения,
    // чтобы сохранить детализацию для точной транскрипции.
    // Объединение произойдет позже, после получения текста от GigaAM.
    const finalSegments = eventData.result.segments;

    return {
      success: true,
      mapping: eventData.result.mapping,
      usedEmbeddings: eventData.result.usedEmbeddings,
      clusterCount: eventData.result.clusterCount,
      taskId,
      processingTimeMs: eventData.result?.processingTimeMs || 0,
      segments: finalSegments,
    };
  }));
}
