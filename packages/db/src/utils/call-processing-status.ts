/**
 * Утилиты для работы со статусом обработки звонка
 */

export const PROCESSING_STATUS = {
  PENDING: "pending",
  TRANSCRIBING: "transcribing",
  TRANSCRIBED: "transcribed",
  EVALUATING: "evaluating",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ProcessingStatus = (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

const VALID_STATUSES = Object.values(PROCESSING_STATUS);

/**
 * Проверяет, является ли строка валидным статусом обработки
 */
export function isValidProcessingStatus(status: string): status is ProcessingStatus {
  return VALID_STATUSES.includes(status as ProcessingStatus);
}

/**
 * Нормализует статус обработки
 * Возвращает null для неизвестных значений
 */
export function normalizeProcessingStatus(
  status: string | null | undefined,
): ProcessingStatus | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (!normalized) return null;
  return isValidProcessingStatus(normalized) ? normalized : null;
}

/**
 * Получает следующий статус в зависимости от события
 */
export function getNextProcessingStatus(
  current: ProcessingStatus | null,
  event:
    | "start_transcription"
    | "complete_transcription"
    | "fail_transcription"
    | "start_evaluation"
    | "complete_evaluation"
    | "fail_evaluation",
): ProcessingStatus {
  switch (event) {
    case "start_transcription":
      return PROCESSING_STATUS.TRANSCRIBING;
    case "complete_transcription":
      return PROCESSING_STATUS.TRANSCRIBED;
    case "fail_transcription":
      return PROCESSING_STATUS.FAILED;
    case "start_evaluation":
      return PROCESSING_STATUS.EVALUATING;
    case "complete_evaluation":
      return PROCESSING_STATUS.COMPLETED;
    case "fail_evaluation":
      return PROCESSING_STATUS.FAILED;
    default:
      return current || PROCESSING_STATUS.PENDING;
  }
}

/**
 * Проверяет, находится ли звонок в активной обработке
 */
export function isProcessing(status: ProcessingStatus | null | undefined): boolean {
  return status === PROCESSING_STATUS.TRANSCRIBING || status === PROCESSING_STATUS.EVALUATING;
}

/**
 * Проверяет, завершена ли обработка (успешно или с ошибкой)
 */
export function isProcessingFinished(status: ProcessingStatus | null | undefined): boolean {
  return status === PROCESSING_STATUS.COMPLETED || status === PROCESSING_STATUS.FAILED;
}

/**
 * Конфигурация отображения статуса в UI
 */
export const PROCESSING_STATUS_CONFIG: Record<
  ProcessingStatus,
  { label: string; color: "gray" | "blue" | "purple" | "green" | "red"; showSpinner: boolean }
> = {
  [PROCESSING_STATUS.PENDING]: { label: "В очереди", color: "gray", showSpinner: false },
  [PROCESSING_STATUS.TRANSCRIBING]: { label: "Транскрипция...", color: "blue", showSpinner: true },
  [PROCESSING_STATUS.TRANSCRIBED]: { label: "Транскрибирован", color: "blue", showSpinner: false },
  [PROCESSING_STATUS.EVALUATING]: { label: "Оценка...", color: "purple", showSpinner: true },
  [PROCESSING_STATUS.COMPLETED]: { label: "Готов", color: "green", showSpinner: false },
  [PROCESSING_STATUS.FAILED]: { label: "Ошибка", color: "red", showSpinner: false },
};
