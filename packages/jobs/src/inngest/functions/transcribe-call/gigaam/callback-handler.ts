/**
 * Inngest функция для обработки callback событий от GigaAM.
 * Используется когда настроен INNGEST_EVENT_KEY в Python сервисе.
 */

import { z } from "zod";
import { gigaAmTranscriptionCompleted, inngest } from "../../../../inngest/client";
import { createLogger } from "../../../../logger";
import type { AsrResult } from "../types";

const logger = createLogger("gigaam-callback-handler");

/**
 * Zod схема для валидации всего события от GigaAM
 */
const GigaAmCompletedEventSchema = z.object({
  task_id: z.string(),
  status: z.enum(["completed", "failed"]),
  result: z
    .union([z.looseObject({}), z.string(), z.number(), z.boolean()])
    .optional()
    .nullable(),
  error: z.string().optional().nullable(),
});

/**
 * Zod схема для валидации НЕ-диаризированного результата (async full transcription)
 */
const NonDiarizedTranscriptionResultSchema = z.object({
  final_transcript: z.string(),
  segments: z
    .array(
      z.object({
        text: z.string(),
        start: z.number().optional(),
        end: z.number().optional(),
        speaker: z.string().optional(),
        confidence: z.number().optional(),
      }),
    )
    .optional(),
});

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
  speakerTimeline: z
    .array(
      z.object({
        speaker: z.string(),
        start: z.number(),
        end: z.number(),
        text: z.string(),
      }),
    )
    .optional(),
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
  num_speakers: z.number().optional(),
  speakers: z.array(z.string()).optional(),
  processing_time: z.number().optional(),
  pipeline: z.string().optional(),
});

/**
 * Union схема для обоих типов результатов
 */
const TranscriptionResultSchema = z.union([
  DiarizedTranscriptionResultSchema,
  NonDiarizedTranscriptionResultSchema,
]);

/**
 * Событие завершения транскрипции от GigaAM
 */
interface GigaAmCompletedEvent {
  task_id: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
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
    // Runtime валидация всего входящего payload
    const eventValidation = GigaAmCompletedEventSchema.safeParse(event.data);
    if (!eventValidation.success) {
      logger.error("GigaAM вернул невалидный payload", {
        validationErrors: eventValidation.error.issues,
      });
      throw new Error(
        `GigaAM вернул невалидный payload: ${JSON.stringify(eventValidation.error.issues)}`,
      );
    }

    const { task_id, status, result, error } = eventValidation.data;

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

    // Runtime валидация результата с помощью Zod (пробуем обе схемы)
    const validationResult = TranscriptionResultSchema.safeParse(result);
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

    // Определяем тип результата
    const isDiarized = "success" in transcriptionResult;

    // Конвертируем результат в AsrResult
    const segments =
      transcriptionResult.segments?.map((s) => ({
        start: s.start ?? 0,
        end: s.end ?? 0,
        speaker: s.speaker || "unknown",
        text: s.text,
      })) ?? [];

    const asrResult: AsrResult = {
      segments,
      transcript: transcriptionResult.final_transcript,
      validationFailed: false,
      metadata: {
        asrLogs: [
          {
            provider: isDiarized ? "gigaam-async-callback-diarized" : "gigaam-async-callback",
            utterances: segments.map((s) => ({
              speaker: s.speaker,
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
      isDiarized,
      processingTime: isDiarized ? transcriptionResult.processing_time : undefined,
    });

    return {
      task_id,
      asrResult,
    };
  },
);
