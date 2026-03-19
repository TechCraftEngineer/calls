/**
 * Вычисление статуса звонка по длительности и направлению.
 * Логика соответствует renderStatusCell в UI.
 */

export type CallStatus = "ПРОПУЩЕН" | "ПРИНЯТ";

export function computeCallStatus(
  duration: number | null | undefined,
  direction: string | null | undefined,
): CallStatus {
  const isMissed =
    (duration ?? 0) === 0 &&
    (direction === "incoming" || direction === "inbound");
  return isMissed ? "ПРОПУЩЕН" : "ПРИНЯТ";
}
