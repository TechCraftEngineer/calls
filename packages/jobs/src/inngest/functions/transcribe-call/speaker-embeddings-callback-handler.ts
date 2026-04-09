/**
 * Inngest функция для обработки callback событий от speaker-embeddings.
 * Используется когда SPEAKER_EMBEDDINGS_ASYNC_MODE=true и настроен INNGEST_EVENT_KEY.
 */

import { z } from "zod";
import { createLogger } from "../../../logger";
import { inngest, speakerEmbeddingsDiarizationCompleted } from "../../client";
import type { DiarizationResult } from "./speaker-diarization";

const logger = createLogger("speaker-embeddings-callback-handler");

/**
 * Zod схема для валидации DiarizationResult от внешнего сервиса
 */
const DiarizationResultSchema = z.object({
  success: z.boolean(),
  segments: z.array(
    z.object({
      start: z.number().finite().nonnegative(),
      end: z.number().finite().nonnegative(),
      speaker: z.string().min(1),
    }).refine((seg) => seg.end > seg.start, {
      message: "end must be greater than start",
    }),
  ).min(1),
  num_speakers: z.number().int().positive(),
  speakers: z.array(z.string().min(1)).refine((speakers) => speakers.length > 0, {
    message: "speakers array must not be empty",
  }),
}).refine((data) => data.speakers.length === data.num_speakers, {
  message: "speakers array length must match num_speakers",
});

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
    triggers: [speakerEmbeddingsDiarizationCompleted],
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

    // Runtime валидация результата с помощью Zod
    const validationResult = DiarizationResultSchema.safeParse(result);
    if (!validationResult.success) {
      logger.error("Speaker-embeddings вернул невалидный результат", {
        task_id,
        validationErrors: validationResult.error.issues,
      });
      throw new Error(
        `Speaker-embeddings вернул невалидный результат: ${JSON.stringify(validationResult.error.issues)}`,
      );
    }

    const validatedResult = validationResult.data;

    logger.info("Callback обработан успешно", {
      task_id,
      segmentsCount: validatedResult.segments.length,
      numSpeakers: validatedResult.num_speakers,
      speakers: validatedResult.speakers,
    });

    return {
      task_id,
      result: validatedResult,
    };
  },
);
