/**
 * Handler для ошибок транскрибации (onFailure)
 */

import { callsService } from "@calls/db";
import type { FailureEventArgs } from "inngest";
import { TranscribeCallEventSchema } from "~/inngest/functions/transcribe-call/schemas";
import { createLogger } from "~/logger";

const logger = createLogger("transcribe-call:failure");

export async function handleFailure({ event, error }: FailureEventArgs): Promise<void> {
  try {
    // В onFailure handler Inngest передаёт событие в другой структуре:
    // event.data.event - исходное событие
    // event.data.event.data - данные исходного события
    let rawEventData: unknown;

    // Сначала пробуем структуру onFailure
    if (event.data && typeof event.data === "object" && "event" in event.data) {
      const failureEvent = event.data as { event?: { data?: unknown } };
      rawEventData = failureEvent.event?.data;
    }

    // Если не получилось, пробуем обычную структуру
    if (!rawEventData) {
      rawEventData = event.data;
    }

    const eventValidation = TranscribeCallEventSchema.safeParse(rawEventData);

    if (!eventValidation.success) {
      logger.error("Ошибка валидации event в onFailure handler", {
        error: eventValidation.error.message,
        eventData: rawEventData,
        fullEvent: event,
      });
      return;
    }

    const { callId } = eventValidation.data;

    // Записываем статус failed в БД
    await callsService.markTranscriptionFailed(callId, error.message);
    logger.error("Транскрибация завершилась с ошибкой после всех попыток", {
      callId,
      error: error.message,
    });
  } catch (dbError) {
    logger.error("Не удалось записать статус ошибки транскрибации", {
      error: dbError instanceof Error ? dbError.message : String(dbError),
      originalError: error.message,
    });
  }
}
