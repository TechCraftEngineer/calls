export const CALL_STATUS = {
  MISSED: "missed",
  ANSWERED: "answered",
  TECHNICAL_ERROR: "technical_error",
} as const;

export type CallStatus = (typeof CALL_STATUS)[keyof typeof CALL_STATUS];

export const MISSED_ALIASES = [
  "missed",
  "unanswered",
  "noanswer",
  "no answer",
  "пропущен",
  "не принят",
  "не отвечен",
  "не состоялся",
  "failed",
] as const;

export const ANSWERED_ALIASES = [
  "answered",
  "accepted",
  "completed",
  "connected",
  "принят",
] as const;

export const TECHNICAL_ERROR_ALIASES = [
  "fail",
  "error",
  "ошибка",
  "technical_error",
  "errored",
] as const;

const STATUS_ALIASES: Record<string, CallStatus> = {
  ...Object.fromEntries(MISSED_ALIASES.map((alias) => [alias, CALL_STATUS.MISSED])),
  ...Object.fromEntries(ANSWERED_ALIASES.map((alias) => [alias, CALL_STATUS.ANSWERED])),
  ...Object.fromEntries(
    TECHNICAL_ERROR_ALIASES.map((alias) => [alias, CALL_STATUS.TECHNICAL_ERROR]),
  ),
};

/**
 * Нормализует статус из внешних систем к универсальному справочнику на английском.
 */
export function normalizeCallStatus(status: string | null | undefined): CallStatus | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (!normalized) return null;
  return STATUS_ALIASES[normalized] ?? null;
}
