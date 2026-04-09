/**
 * Inngest функция для обработки callback событий от GigaAM.
 * Используется когда GIGA_AM_ASYNC_MODE=true и настроен INNGEST_EVENT_KEY.
 */

import { createLogger } from "~/logger";
import { gigaAmTranscriptionCompleted, inngest } from "../../../client";
import type { AsrResult } from "../types";
import type { DiarizedTranscriptionResult } from "./client";

const logger = createLogger("gigaam-callback-handler");

/**
 * Событие завершения транскрипции от GigaAM
 */
interface GigaAmCompletedEvent {
  task_id: string;
  status: "completed" | "failed";
  result?: DiarizedTranscriptionResult;
  error?: string;
}

/**
 * Inngest функция для обработки callback событий от GigaAM.
 * Слушает событие giga-am/transcription.completed
 */
export const gigaAmCompletedFn = inngest.createFunction(
  {
    id: "giga-am-completed",
    name: "GigaAM Transcription Completed (Callback)",
    triggers: [gigaAmTranscriptionCompleted],
    retries: 1,
  },
  async ({ event }: { event: { data: GigaAmCompletedEvent } }) => {
    const { task_id, status, result, error } = event.data;

    logger.info("Получен callback от GigaAM", {
      task_id,
      status,
      hasResult: !!result,
      hasError: !!error,
    });

    if (status === "failed") {
      logger.error("GigaAM транскрипция завершилась с ошибкой", {
        task_id,
        error,
      });
      throw new Error(
        `Транскрипция GigaAM завершилась с ошибкой: ${error || "Неизвестная ошибка"}`,
      );
    }

    if (!result) {
      logger.error("GigaAM вернул статус completed но без результата", {
        task_id,
      });
      throw new Error("GigaAM вернул статус completed без результата");
    }

    // Type assertion для result - данные приходят от внешнего сервиса
    const transcriptionResult = result as DiarizedTranscriptionResult;

    // Конвертируем DiarizedTranscriptionResult в AsrResult
    const asrResult: AsrResult = {
      segments: transcriptionResult.segments.map((s) => ({
        start: s.start,
        end: s.end,
        speaker: s.speaker || "unknown",
        text: s.text,
      })),
      transcript: transcriptionResult.final_transcript,
      validationFailed: false,
      metadata: {
        asrLogs: [
          {
            provider: "gigaam-async-callback",
            utterances: transcriptionResult.segments.map((s) => ({
              speaker: s.speaker || "unknown",
              text: s.text,
              start: s.start,
              end: s.end,
            })),
            raw: result,
          },
        ],
      },
    };

    logger.info("Callback обработан успешно", {
      task_id,
      transcriptLength: asrResult.transcript.length,
      segmentsCount: asrResult.segments.length,
      processingTime: transcriptionResult.processing_time,
    });

    return {
      task_id,
      asrResult,
    };
  },
);
