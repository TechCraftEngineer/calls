import { createLogger } from "~/logger";
import { getAudioDurationFromUrl } from "../audio/get-audio-duration";
import { transcribeWithGigaAm } from "../providers/gigaam";
import type { AsrResult } from "../types";

const logger = createLogger("asr-pipeline-run-asr");

export async function runAsrProviders(processedAudioUrl: string): Promise<{
  gigaAmSuccessful: AsrResult[];
  gigaAmBest: AsrResult | null;
  gigaAmErrors: string[];
  gigaAmProviderCount: number;
  gigaAmSuccessCount: number;
  durationFromUrl?: number;
}> {
  const [gigaAmResult, durationResult] = await Promise.allSettled([
    transcribeWithGigaAm(processedAudioUrl),
    getAudioDurationFromUrl(processedAudioUrl),
  ]);

  const gigaAm =
    gigaAmResult.status === "fulfilled" ? gigaAmResult.value : null;
  const gigaAmSuccessful = gigaAm ? [gigaAm] : [];
  const gigaAmBest = gigaAm;

  const gigaAmErrors: string[] = [];
  if (gigaAmResult.status === "rejected") {
    gigaAmErrors.push(
      gigaAmResult.reason instanceof Error
        ? gigaAmResult.reason.message
        : String(gigaAmResult.reason),
    );
  }

  const gigaAmProviderCount = 1;
  const gigaAmSuccessCount = gigaAmSuccessful.length;

  if (gigaAmErrors.length > 0) {
    logger.warn("Giga AM распознавание не удалось", { errors: gigaAmErrors });
  }

  if (!gigaAmBest) {
    throw new Error(
      "Giga AM не вернул результат (проверьте GIGA_AM_ENABLED, GIGA_AM_TRANSCRIBE_URL и доступность сервиса)",
    );
  }

  const durationFromUrl =
    durationResult.status === "fulfilled" ? durationResult.value : undefined;

  return {
    gigaAmSuccessful,
    gigaAmBest,
    gigaAmErrors,
    gigaAmProviderCount,
    gigaAmSuccessCount,
    durationFromUrl,
  };
}
