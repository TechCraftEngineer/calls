import { CALL_STATUS, type CallStatus } from "../../utils/call-status";

export function computeCallStatus(
  duration: number | null | undefined,
  direction: string | null | undefined,
): CallStatus {
  const isMissed = (duration ?? 0) === 0 && direction === "inbound";
  return isMissed ? CALL_STATUS.MISSED : CALL_STATUS.ANSWERED;
}
