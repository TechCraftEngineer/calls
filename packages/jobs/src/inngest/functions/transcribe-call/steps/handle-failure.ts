/**
 * Handler для ошибок транскрибации (onFailure)
 */

import { callsService } from "@calls/db";
import { createLogger } from "../../../../logger";
import { TranscribeCallEventSchema } from "../schemas";
import type { FailureEventArgs } from "inngest";

const logger = createLogger("transcribe-call:failure");

export async function handleFailure({ event, error }: FailureEventArgs): Promise<void> {
  try {
    // Пытаемся получить callId из разных источников (Inngest может передавать по-разному)
    const rawEventData =
      event.data ||
      (event as unknown as { event?: { data?: { callId?: string } } }).event?.data;
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
