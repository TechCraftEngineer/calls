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

  const assemblyCostRub =
    durationHours * env.ASSEMBLYAI_RATE_USD_PER_HOUR * env.RUB_PER_USD;
  const yandexRateRubPerSecond =
    // приоритет — ставка за секунду
    env.YANDEX_SPEECHKIT_RATE_RUB_PER_SECOND ??
    // fallback — ставка за минуту (на старых конфигах)
    env.YANDEX_SPEECHKIT_RATE_RUB_PER_MINUTE / 60;
  const yandexCostRub = durationInSeconds * yandexRateRubPerSecond;

  return Number((assemblyCostRub + yandexCostRub).toFixed(2));
}
