import { env } from "@calls/config";

export function calculateAnalysisCostRub(
  durationInSeconds?: number | null,
): number | null {
  if (
    typeof durationInSeconds !== "number" ||
    Number.isNaN(durationInSeconds) ||
    durationInSeconds <= 0
  ) {
    return null;
  }

  const durationHours = durationInSeconds / 3600;
  const durationMinutes = durationInSeconds / 60;

  const assemblyCostRub =
    durationHours * env.ASSEMBLYAI_RATE_USD_PER_HOUR * env.RUB_PER_USD;
  const yandexCostRub =
    durationMinutes * env.YANDEX_SPEECHKIT_RATE_RUB_PER_MINUTE;

  return Number((assemblyCostRub + yandexCostRub).toFixed(2));
}
