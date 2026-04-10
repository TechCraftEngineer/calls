/**
 * Асинхронный клиент для GigaAM с callback режимом.
 * Python сервис отправляет результат в Inngест через событие giga-am/transcription.completed.
 */

import type { DiarizedTranscriptionResult } from "./client";

/**
 * Типы для экспорта в другие модули
 */
export type { DiarizedTranscriptionResult };
