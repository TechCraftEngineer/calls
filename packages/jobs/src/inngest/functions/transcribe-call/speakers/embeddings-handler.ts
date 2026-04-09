/**
 * Обработчик callback от speaker embeddings сервиса
 */

import { z } from "zod";
import { createLogger } from "~/logger";
import { speakerEmbeddingsDiarizationCompleted, inngest } from "~/inngest/client";
import type { SpeakerDiarizationResult } from "./diarization";

const logger = createLogger("speaker-embeddings-callback");

/**
 * Данные callback от speaker embeddings сервиса
 */
export interface SpeakerEmbeddingsCallbackData {
  callId: string;
  workspaceId: string;
  status: "completed" | "failed";
  result?: SpeakerDiarizationResult;
  error?: string;
  processingTimeMs?: number;
}

/**
 * Валидирует данные callback
 */
export function validateSpeakerEmbeddingsCallback(
  data: unknown
): data is SpeakerEmbeddingsCallbackData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const d = data as Record<string, unknown>;

  if (typeof d.callId !== "string" || d.callId.length === 0) {
    return false;
  }

  if (typeof d.workspaceId !== "string" || d.workspaceId.length === 0) {
    return false;
  }

  if (d.status !== "completed" && d.status !== "failed") {
    return false;
  }

  return true;
}

/**
 * Обрабатывает callback от speaker embeddings сервиса
 */
export async function handleSpeakerEmbeddingsCallback(
  data: SpeakerEmbeddingsCallbackData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    logger.info("Received speaker embeddings callback", {
      callId: data.callId,
      workspaceId: data.workspaceId,
      status: data.status,
      processingTimeMs: data.processingTimeMs,
    });

    if (data.status === "failed") {
      logger.warn("Speaker embeddings processing failed", {
        callId: data.callId,
        error: data.error,
      });
      return {
        success: false,
        error: data.error || "Unknown error",
      };
    }

    if (!data.result) {
      logger.error("Missing result in completed callback", {
        callId: data.callId,
      });
      return {
        success: false,
        error: "Missing result in completed callback",
      };
    }

    // Здесь можно добавить сохранение результата в базу данных
    // или отправку события в другой сервис
    logger.info("Speaker embeddings processing completed", {
      callId: data.callId,
      mapping: data.result.mapping,
      usedEmbeddings: data.result.usedEmbeddings,
      clusterCount: data.result.clusterCount,
    });

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error handling speaker embeddings callback", {
      callId: data.callId,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Создает Inngest event для обработки результатов speaker embeddings
 */
export function createSpeakerEmbeddingsCompletedEvent(
  data: SpeakerEmbeddingsCallbackData
) {
  return {
    name: "app/speaker.embeddings.completed",
    data,
  };
}

/**
 * Zod схема для валидации события от speaker embeddings
 */
const SpeakerEmbeddingsCallbackSchema = z.object({
  task_id: z.string(),
  status: z.enum(["completed", "failed"]),
  result: z.object({}).passthrough().optional().nullable(),
  error: z.string().optional().nullable(),
});

/**
 * Тип события от speaker embeddings
 */
interface SpeakerEmbeddingsEvent {
  task_id: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Inngest функция для обработки callback событий от speaker embeddings сервиса
 */
export const speakerEmbeddingsCompletedFn = inngest.createFunction(
  {
    id: "speaker-embeddings-completed",
    name: "Speaker Embeddings: Callback Handler",
    triggers: [speakerEmbeddingsDiarizationCompleted],
    retries: 2,
  },
  async ({ event }: { event: { data: SpeakerEmbeddingsEvent } }) => {
    // Runtime валидация входящего payload
    const eventValidation = SpeakerEmbeddingsCallbackSchema.safeParse(event.data);
    if (!eventValidation.success) {
      logger.error("Speaker embeddings вернул невалидный payload", {
        validationErrors: eventValidation.error.issues,
      });
      throw new Error(
        `Speaker embeddings вернул невалидный payload: ${JSON.stringify(eventValidation.error.issues)}`,
      );
    }

    const { task_id, status, result, error } = eventValidation.data;

    logger.info("Получен callback от speaker embeddings", {
      task_id,
      status,
      hasResult: !!result,
      hasError: !!error,
    });

    if (status === "failed") {
      logger.error("Speaker embeddings завершился с ошибкой", {
        task_id,
        error,
      });
      throw new Error(
        `Speaker embeddings завершился с ошибкой: ${error || "Неизвестная ошибка"}`,
      );
    }

    if (!result) {
      logger.error("Speaker embeddings вернул статус completed но без результата", {
        task_id,
      });
      throw new Error("Speaker embeddings вернул статус completed без результата");
    }

    return {
      success: true,
      task_id,
      result,
    };
  }
);
