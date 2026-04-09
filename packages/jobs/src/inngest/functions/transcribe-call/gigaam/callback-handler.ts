/**
 * Inngest функция для обработки callback событий от GigaAM.
 * Используется когда GIGA_AM_ASYNC_MODE=true и настроен INNGEST_EVENT_KEY.
 */

import { z } from "zod";
import { createLogger } from "../../../../logger";
import { gigaAmTranscriptionCompleted, inngest } from "../../../client";
import type { AsrResult } from "../types";
import type { DiarizedTranscriptionResult } from "./client";

const logger = createLogger("gigaam-callback-handler");

/**
 * Zod схема для валидации DiarizedTranscriptionResult от внешнего сервиса
 */
const DiarizedTranscriptionResultSchema = z.object({
  success: z.boolean(),
  final_transcript: z.string(),
  segments: z.array(
    z.object({
      text: z.string(),
      start: z.number(),
      end: z.number(),
      speaker: z.string().optional(),
      confidence: z.number(),
    }),
  ),
  speakerTimeline: z.array(
    z.object({
      speaker: z.string(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
    }),
  ),
  speaker_timeline: z
    .array(
      z.object({
        speaker: z.string(),
        start: z.number(),
        end: z.number(),
        text: z.string(),
      }),
    )
    .optional(),
  num_speakers: z.number(),
  speakers: z.array(z.string()),
  processing_time: z.number(),
  pipeline: z.string(),
});

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

    // Runtime валидация результата с помощью Zod
    const validationResult = DiarizedTranscriptionResultSchema.safeParse(result);
    if (!validationResult.success) {
      logger.error("GigaAM вернул невалидный результат", {
        task_id,
        validationErrors: validationResult.error.issues,
      });
      throw new Error(
        `GigaAM вернул невалидный результат: ${JSON.stringify(validationResult.error.issues)}`,
      );
    }

    const transcriptionResult = validationResult.data;

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
