const RUB_PER_USD = 90;

// AssemblyAI Universal-3 Pro + Speaker Diarization.
const ASSEMBLYAI_RATE_USD_PER_HOUR = 0.21 + 0.02;

// Yandex SpeechKit STT long-running recognition.
const YANDEX_SPEECHKIT_RATE_RUB_PER_MINUTE = 0.6;

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
    durationHours * ASSEMBLYAI_RATE_USD_PER_HOUR * RUB_PER_USD;
  const yandexCostRub = durationMinutes * YANDEX_SPEECHKIT_RATE_RUB_PER_MINUTE;

  return Number((assemblyCostRub + yandexCostRub).toFixed(2));
}
