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
  /** Таймаут для LLM merge операций (40 минут) */
  MERGE_TIMEOUT_MS: 2_400_000,
  /** Таймаут для коррекции транскрипции (20 минут) */
  CORRECTION_TIMEOUT_MS: 1_200_000,
  /** Таймаут для идентификации спикеров (20 минут) */
  SPEAKER_IDENTIFICATION_TIMEOUT_MS: 1_200_000,
  /** Таймаут для нормализации (20 минут) */
  NORMALIZE_TIMEOUT_MS: 1_200_000,
  /** Таймаут для суммаризации (20 минут) */
  SUMMARIZE_TIMEOUT_MS: 1_200_000,
} as const;

/**
 * Конфигурация для speaker embeddings сервиса
 */
export const SPEAKER_CONFIG = {
  /** Таймаут для диаризации (60 минут) */
  TIMEOUT_MS: 3_600_000,
  /** Таймаут для health check (120 секунд) */
  HEALTH_TIMEOUT_MS: 120_000,
  /** Таймаут для асинхронного запроса (120 секунд) - учитывает холодный старт сервиса */
  ASYNC_REQUEST_TIMEOUT_MS: 120_000,
} as const;

/**
 * Конфигурация для Giga AM сервиса
 */
export const GIGA_AM_CONFIG = {
  /** Таймаут для транскрибации (30 минут) */
  TIMEOUT_MS: 1_800_000,
  /** Таймаут для асинхронного запроса (120 секунд) - учитывает холодный старт сервиса */
  ASYNC_REQUEST_TIMEOUT_MS: 120_000,
} as const;
