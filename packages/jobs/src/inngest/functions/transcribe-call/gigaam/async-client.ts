/**
 * Асинхронный клиент для GigaAM с callback или polling.
 * Приоритет: callback > polling
 */

import { env } from "@calls/config";
import { createLogger } from "../../../../logger";
import { checkTranscriptionStatus, type DiarizedTranscriptionResult } from "./client";

const logger = createLogger("gigaam-async-client");

const POLL_INTERVAL_MS = 30_000; // 30 секунд
const MAX_POLL_ATTEMPTS = 60; // Максимум 30 минут (60 * 30 сек)

/**
 * Проверяет доступен ли callback режим (настроен INNGEST_EVENT_KEY в giga-am сервисе)
 */
export function isCallbackModeAvailable(): boolean {
  // Проверяем есть ли INNGEST_EVENT_KEY в конфигурации
  // Это означает что giga-am сервис может отправлять callback события
  return !!env.INNGEST_EVENT_KEY;
}

/**
 * Ожидает завершения асинхронной транскрипции через polling.
 * Используется как fallback когда callback режим недоступен.
 */
export async function waitForAsyncTranscription(
  taskId: string,
): Promise<DiarizedTranscriptionResult> {
  logger.info("Начало polling статуса асинхронной транскрипции", {
    taskId,
    pollInterval: POLL_INTERVAL_MS,
    maxAttempts: MAX_POLL_ATTEMPTS,
    mode: "polling",
  });

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    let status: Awaited<ReturnType<typeof checkTranscriptionStatus>>;
    try {
      status = await checkTranscriptionStatus(taskId);
    } catch (error) {
      logger.error("Ошибка при проверке статуса асинхронной транскрипции", {
        taskId,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      // Если это не последняя попытка - пробуем еще раз (только для transient ошибок)
      if (attempt < MAX_POLL_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      throw error;
    }

    // Проверка статуса вне try/catch - fatal ошибки не вызывают retry
    if (status.status === "completed" && status.result) {
      logger.info("Асинхронная транскрипция завершена", {
        taskId,
        attempt,
        processingTime: status.result.processing_time,
        mode: "polling",
      });
      return status.result;
    }

    if (status.status === "failed") {
      throw new Error(
        `Асинхронная транскрипция завершилась с ошибкой: ${status.error || "Неизвестная ошибка"}`,
      );
    }

    // Все еще pending или processing - продолжаем polling
    logger.info("Ожидание завершения асинхронной транскрипции", {
      taskId,
      attempt,
      status: status.status,
    });

    if (attempt < MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error(
    `Таймаут ожидания асинхронной транскрипции (taskId: ${taskId}, попыток: ${MAX_POLL_ATTEMPTS})`,
  );
}
