/**
 * Асинхронный клиент для GigaAM с callback режимом.
 * Python сервис отправляет результат в Inngест через событие giga-am/transcription.completed.
 */

import { createLogger } from "~/logger";
import type { DiarizedTranscriptionResult } from "~/inngest/functions/transcribe-call/gigaam/client";

const logger = createLogger("gigaam-async-client");

/**
 * Типы для экспорта в другие модули
 */
export type { DiarizedTranscriptionResult };
