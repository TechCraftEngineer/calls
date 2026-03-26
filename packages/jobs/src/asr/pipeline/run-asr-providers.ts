import { createLogger } from "~/logger";
import { getAudioDurationFromUrl } from "../audio/get-audio-duration";
import { transcribeWithAssemblyAi } from "../providers/assemblyai";
import { transcribeWithGigaAm } from "../providers/gigaam";
import { transcribeWithYandex } from "../providers/yandex";
import type { AsrResult } from "../types";

const logger = createLogger("asr-pipeline-run-asr");

export async function runAsrProviders(
  processedAudioUrl: string,
  options: {
    /**
     * Если true — считаем, что аудио по URL является LINEAR16_PCM (wav 16-bit).
     * Это нужно только Yandex, т.к. он иначе ожидает MP3.
     */
    useLinear16PcmForYandex: boolean;
    yandexSampleRateHertz: number;
  },
): Promise<{
  assemblyai: AsrResult | null;
  yandex: AsrResult | null;
  assemblyaiError?: string;
  yandexError?: string;
  gigaAmSuccessful: AsrResult[];
  gigaAmBest: AsrResult | null;
  gigaAmErrors: string[];
  gigaAmProviderCount: number;
  gigaAmSuccessCount: number;
  durationFromUrl?: number;
}> {
  const [assemblyaiResult, yandexResult, gigaAmResult, durationResult] =
    await Promise.allSettled([
      transcribeWithAssemblyAi(processedAudioUrl),
      transcribeWithYandex(
        processedAudioUrl,
        options.useLinear16PcmForYandex
          ? {
              audioEncoding: "LINEAR16_PCM",
              sampleRateHertz: options.yandexSampleRateHertz,
            }
          : undefined,
      ),
      transcribeWithGigaAm(processedAudioUrl),
      getAudioDurationFromUrl(processedAudioUrl),
    ]);

  const assemblyai =
    assemblyaiResult.status === "fulfilled" ? assemblyaiResult.value : null;
  const yandex =
    yandexResult.status === "fulfilled" ? yandexResult.value : null;

  const gigaAm =
    gigaAmResult.status === "fulfilled" ? gigaAmResult.value : null;
  const gigaAmSuccessful = gigaAm ? [gigaAm] : [];
  const gigaAmBest = gigaAm;

  const assemblyaiError =
    assemblyaiResult.status === "rejected"
      ? assemblyaiResult.reason instanceof Error
        ? assemblyaiResult.reason.message
        : String(assemblyaiResult.reason)
      : undefined;
  const yandexError =
    yandexResult.status === "rejected"
      ? yandexResult.reason instanceof Error
        ? yandexResult.reason.message
        : String(yandexResult.reason)
      : undefined;

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

  if (assemblyaiResult.status === "rejected") {
    logger.warn("AssemblyAI распознавание не удалось", {
      error: assemblyaiError,
    });
  }
  if (yandexResult.status === "rejected") {
    logger.warn("Yandex распознавание не удалось", { error: yandexError });
  }
  if (gigaAmErrors.length > 0) {
    logger.warn("Giga AM распознавание не удалось", { errors: gigaAmErrors });
  }

  if (!assemblyai && !yandex && !gigaAmBest) {
    throw new Error(
      "Ни один ASR провайдер не вернул результат (проверьте API ключи и Giga AM)",
    );
  }

  const durationFromUrl =
    durationResult.status === "fulfilled" ? durationResult.value : undefined;

  return {
    assemblyai,
    yandex,
    assemblyaiError,
    yandexError,
    gigaAmSuccessful,
    gigaAmBest,
    gigaAmErrors,
    gigaAmProviderCount,
    gigaAmSuccessCount,
    durationFromUrl,
  };
}
