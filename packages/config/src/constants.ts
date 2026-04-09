import { env } from "./env";

export const APP_CONFIG = {
  name: env.NEXT_PUBLIC_APP_NAME,
  shortName: env.NEXT_PUBLIC_APP_SHORT_NAME,
  url: env.NEXT_PUBLIC_APP_URL,
} as const;

/**
 * Конфигурация таймаутов для LLM операций
 */
export const LLM_CONFIG = {
  /** Таймаут для LLM merge операций (10 минут) */
  MERGE_TIMEOUT_MS: 600_000,
  /** Таймаут для коррекции транскрипции (10 минут) */
  CORRECTION_TIMEOUT_MS: 600_000,
  /** Таймаут для идентификации спикеров (10 минут) */
  SPEAKER_IDENTIFICATION_TIMEOUT_MS: 600_000,
  /** Таймаут для нормализации (10 минут) */
  NORMALIZE_TIMEOUT_MS: 600_000,
  /** Таймаут для суммаризации (10 минут) */
  SUMMARIZE_TIMEOUT_MS: 600_000,
} as const;

/**
 * Конфигурация для speaker embeddings сервиса
 */
export const SPEAKER_CONFIG = {
  /** Таймаут для диаризации (30 минут) */
  TIMEOUT_MS: 1_800_000,
  /** Таймаут для health check (60 секунд) */
  HEALTH_TIMEOUT_MS: 60_000,
} as const;

/**
 * Конфигурация для Giga AM сервиса
 */
export const GIGA_AM_CONFIG = {
  /** Таймаут для транскрибации (15 минут) */
  TIMEOUT_MS: 900_000,
  /** Таймаут для асинхронного запроса (60 секунд) - учитывает холодный старт сервиса */
  ASYNC_REQUEST_TIMEOUT_MS: 60_000,
} as const;
