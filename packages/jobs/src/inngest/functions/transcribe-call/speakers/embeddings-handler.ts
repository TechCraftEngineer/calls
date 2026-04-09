/**
 * Обработчик callback от speaker embeddings сервиса
 */

import { createLogger } from "~/logger";
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
