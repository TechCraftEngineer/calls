/**
 * Inngest функция для обработки callback событий от speaker-embeddings.
 * Используется когда SPEAKER_EMBEDDINGS_ASYNC_MODE=true и настроен INNGEST_EVENT_KEY.
 */

import { createLogger } from "../../../logger";
import { inngest } from "../../client";
import type { DiarizationResult } from "./speaker-diarization";

const logger = createLogger("speaker-embeddings-callback-handler");

/**
 * Событие завершения диаризации от speaker-embeddings
 */
interface SpeakerEmbeddingsCompletedEvent {
  task_id: string;
  status: "completed" | "failed";
  result?: DiarizationResult;
  error?: string;
}

/**
 * Inngest функция для обработки callback событий от speaker-embeddings.
 * Слушает событие speaker-embeddings/diarization.completed
 */
export const speakerEmbeddingsCompletedFn = inngest.createFunction(
  {
    id: "speaker-embeddings-completed",
    name: "Speaker Embeddings Diarization Completed (Callback)",
    triggers: [
      {
        event: "speaker-embeddings/diarization.completed",
      },
    ],
    retries: 1,
  },
  async ({ event }: { event: { data: SpeakerEmbeddingsCompletedEvent } }) => {
    const { task_id, status, result, error } = event.data;

    logger.info("Получен callback от speaker-embeddings", {
      task_id,
      status,
      hasResult: !!result,
      hasError: !!error,
    });

    if (status === "failed") {
      logger.error("Speaker-embeddings диаризация завершилась с ошибкой", {
        task_id,
        error,
      });
      throw new Error(
        `Диаризация speaker-embeddings завершилась с ошибкой: ${error || "Неизвестная ошибка"}`,
      );
    }

    if (!result) {
      logger.error("Speaker-embeddings вернул статус completed но без результата", {
        task_id,
      });
      throw new Error("Speaker-embeddings вернул статус completed без результата");
    }

    logger.info("Callback обработан успешно", {
      task_id,
      segmentsCount: result.segments.length,
      numSpeakers: result.num_speakers,
      speakers: result.speakers,
    });

    return {
      task_id,
      result,
    };
  },
);
