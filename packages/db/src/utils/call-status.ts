export const CALL_STATUS = {
  MISSED: "missed",
  ANSWERED: "answered",
} as const;

export type CallStatus = (typeof CALL_STATUS)[keyof typeof CALL_STATUS];

const STATUS_ALIASES: Record<string, CallStatus> = {
  missed: CALL_STATUS.MISSED,
  unanswered: CALL_STATUS.MISSED,
  noanswer: CALL_STATUS.MISSED,
  "no answer": CALL_STATUS.MISSED,
  пропущен: CALL_STATUS.MISSED,
  "не принят": CALL_STATUS.MISSED,
  "не отвечен": CALL_STATUS.MISSED,
  answered: CALL_STATUS.ANSWERED,
  accepted: CALL_STATUS.ANSWERED,
  completed: CALL_STATUS.ANSWERED,
  connected: CALL_STATUS.ANSWERED,
  принят: CALL_STATUS.ANSWERED,
};

/**
 * Нормализует статус из внешних систем к универсальному справочнику на английском.
 */
export function normalizeCallStatus(
  status: string | null | undefined,
): CallStatus | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (!normalized) return null;
  return STATUS_ALIASES[normalized] ?? null;
}
