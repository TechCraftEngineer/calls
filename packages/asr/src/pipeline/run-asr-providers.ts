import { createLogger } from "@calls/logger";
import { getAudioDurationFromBuffer } from "../audio/get-audio-duration";
import { transcribeWithGigaAm } from "../providers/gigaam";
import type { AsrResult } from "../types";

const logger = createLogger("asr-pipeline-run-asr");

export async function runAsrProviders(
  processedAudioUrl: string,
  options?: {
    gigaPreprocessMetadata?: Record<string, unknown> | null;
  },
): Promise<{
  gigaAmSuccessful: AsrResult[];
  gigaAmBest: AsrResult | null;
  gigaAmErrors: string[];
  gigaAmProviderCount: number;
  gigaAmSuccessCount: number;
  durationFromUrl?: number;
}> {
  // Get audio buffer for duration calculation
  let audioBuffer: Buffer | undefined;
  try {
    const response = await fetch(processedAudioUrl, {
      headers: { Accept: "audio/*" },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }
  } catch (err) {
    logger.warn("Не удалось загрузить аудио для определения длительности", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const [gigaAmResult, durationResult] = await Promise.allSettled([
    transcribeWithGigaAm(processedAudioUrl, {
      preprocessMetadata: options?.gigaPreprocessMetadata,
      audioBuffer,
    }),
    audioBuffer ? getAudioDurationFromBuffer(audioBuffer) : Promise.resolve(undefined),
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
