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
 * Проверяет, является ли ошибка transient (временной) и должна быть ретраена.
 * Transient ошибки: 5xx, network errors, timeouts
 * Non-transient ошибки: 4xx (client errors)
 */
function isTransientError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Проверяем на network errors
  if (
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("network")
  ) {
    return true;
  }

  // Проверяем на 5xx ошибки из GigaAM API
  const statusMatch = errorMessage.match(/status (\d{3})/);
  if (statusMatch && statusMatch[1]) {
    const status = parseInt(statusMatch[1], 10);
    return status >= 500;
  }

  // Timeout ошибки
  if (errorMessage.includes("timeout") || errorMessage.includes("AbortError")) {
    return true;
  }

  // По умолчанию считаем non-transient
  return false;
}

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
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Проверяем, является ли ошибка transient (5xx, network errors)
      // Для 4xx ошибок сразу выбрасываем исключение без retry
      const isTransient = isTransientError(error);

      logger.error("Ошибка при проверке статуса асинхронной транскрипции", {
        taskId,
        attempt,
        error: errorMessage,
        isTransient,
      });

      // Если это не transient ошибка или последняя попытка - выбрасываем исключение
      if (!isTransient || attempt === MAX_POLL_ATTEMPTS) {
        throw error;
      }

      // Для transient ошибок retry
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
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
