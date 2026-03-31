import { env } from "@calls/config";

export function calculateAnalysisCostRub(durationInSeconds?: number | null): number | null {
  if (
    typeof durationInSeconds !== "number" ||
    Number.isNaN(durationInSeconds) ||
    durationInSeconds <= 0
  ) {
    return null;
  }

  const asrCostRub = durationInSeconds * env.GIGA_AM_RATE_RUB_PER_SECOND;

  return Number(asrCostRub.toFixed(2));
}
