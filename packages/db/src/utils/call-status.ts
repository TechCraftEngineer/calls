export const CALL_STATUS = {
  MISSED: "missed",
  ANSWERED: "answered",
  VOICEMAIL: "voicemail",
  TECHNICAL_ERROR: "technical_error",
} as const;

export type CallStatus = (typeof CALL_STATUS)[keyof typeof CALL_STATUS];

export const MISSED_ALIASES = [
  "missed",
  "unanswered",
  "noanswer",
  "no answer",
  "cancelled",
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
  "success",
  "принят",
] as const;

export const TECHNICAL_ERROR_ALIASES = [
  "fail",
  "error",
  "ошибка",
  "technical_error",
  "errored",
  "busy",
  "notavailable",
  "notallowed",
  "занят",
  "недоступен",
  "запрещено",
] as const;

export const VOICEMAIL_ALIASES = [
  "voicemail",
  "voice_mail",
  "voice mail",
  "автоответчик",
  "голосовая почта",
  "голос. почта",
  "запись",
] as const;

const STATUS_ALIASES: Record<string, CallStatus> = {
  ...Object.fromEntries(MISSED_ALIASES.map((alias) => [alias, CALL_STATUS.MISSED])),
  ...Object.fromEntries(ANSWERED_ALIASES.map((alias) => [alias, CALL_STATUS.ANSWERED])),
  ...Object.fromEntries(
    TECHNICAL_ERROR_ALIASES.map((alias) => [alias, CALL_STATUS.TECHNICAL_ERROR]),
  ),
  ...Object.fromEntries(VOICEMAIL_ALIASES.map((alias) => [alias, CALL_STATUS.VOICEMAIL])),
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
