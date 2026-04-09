/**
 * Обработчик callback от speaker embeddings сервиса
 */

import { z } from "zod";
import { inngest, speakerEmbeddingsDiarizationCompleted } from "../../../../inngest/client";
import { createLogger } from "../../../../logger";
import type { SpeakerDiarizationResult } from "./diarization";

const logger = createLogger("speaker-embeddings-callback");

/**
 * Данные callback от speaker embeddings сервиса
 */
export interface SpeakerEmbeddingsCallbackData {
  task_id: string;
  call_id: string;
  status: "completed" | "failed";
  result?: SpeakerDiarizationResult;
  error?: string;
}

/**
 * Валидирует данные callback
 */
export function validateSpeakerEmbeddingsCallback(
  data: unknown,
): data is SpeakerEmbeddingsCallbackData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const d = data as Record<string, unknown>;

  if (typeof d.task_id !== "string" || d.task_id.length === 0) {
    return false;
  }

  if (typeof d.call_id !== "string" || d.call_id.length === 0) {
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
  data: SpeakerEmbeddingsCallbackData,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    logger.info("Received speaker embeddings callback", {
      task_id: data.task_id,
      call_id: data.call_id,
      status: data.status,
    });

    if (data.status === "failed") {
      logger.warn("Speaker embeddings processing failed", {
        task_id: data.task_id,
        call_id: data.call_id,
        error: data.error,
      });
      return {
        success: false,
        error: data.error || "Unknown error",
      };
    }

    if (!data.result) {
      logger.error("Missing result in completed callback", {
        task_id: data.task_id,
        call_id: data.call_id,
      });
      return {
        success: false,
        error: "Missing result in completed callback",
      };
    }

    // Здесь можно добавить сохранение результата в базу данных
    // или отправку события в другой сервис
    logger.info("Speaker embeddings processing completed", {
      task_id: data.task_id,
      call_id: data.call_id,
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
      task_id: data.task_id,
      call_id: data.call_id,
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
export function createSpeakerEmbeddingsCompletedEvent(data: SpeakerEmbeddingsCallbackData) {
  return {
    name: "speaker-embeddings/diarization.completed",
    data,
  };
}

/**
 * Zod схема для валидации события от speaker embeddings
 */
const SpeakerEmbeddingsCallbackSchema = z.object({
  task_id: z.string(),
  call_id: z.string(),
  status: z.enum(["completed", "failed"]),
  result: z.object({}).passthrough().optional().nullable(),
  error: z.string().optional().nullable(),
});

/**
 * Тип события от speaker embeddings
 */
interface SpeakerEmbeddingsEvent {
  task_id: string;
  call_id: string;
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

    const { task_id, call_id, status, result, error } = eventValidation.data;

    logger.info("Получен callback от speaker embeddings", {
      task_id,
      call_id,
      status,
      hasResult: !!result,
      hasError: !!error,
    });

    if (status === "failed") {
      logger.error("Speaker embeddings завершился с ошибкой", {
        task_id,
        call_id,
        error,
      });
      throw new Error(`Speaker embeddings завершился с ошибкой: ${error || "Неизвестная ошибка"}`);
    }

    if (!result) {
      logger.error("Speaker embeddings вернул статус completed но без результата", {
        task_id,
        call_id,
      });
      throw new Error("Speaker embeddings вернул статус completed без результата");
    }

    return {
      success: true,
      task_id,
      call_id,
      result,
    };
  },
);
