import { createLogger } from "../../logger";
import { getAudioDurationFromUrl } from "../audio/get-audio-duration";
import { transcribeWithAssemblyAi } from "../providers/assemblyai";
import {
  getHuggingFaceAsrModels,
  transcribeWithHuggingFace,
} from "../providers/huggingface";
import { transcribeWithYandex } from "../providers/yandex";
import type { AsrResult } from "../types";

const logger = createLogger("asr-pipeline-run-asr");

export async function runAsrProviders(
  processedAudioUrl: string,
  tempKey: string | null,
  yandexSampleRateHertz: number,
): Promise<{
  assemblyai: AsrResult | null;
  yandex: AsrResult | null;
  assemblyaiError?: string;
  yandexError?: string;
  huggingFaceSuccessful: AsrResult[];
  huggingFaceBest: AsrResult | null;
  huggingFaceErrors: string[];
  huggingFaceModelCount: number;
  huggingFaceSuccessCount: number;
  durationFromUrl?: number;
}> {
  const huggingFaceModels = getHuggingFaceAsrModels();

  const [assemblyaiResult, yandexResult, huggingFaceResults, durationResult] =
    await Promise.allSettled([
      transcribeWithAssemblyAi(processedAudioUrl),
      transcribeWithYandex(
        processedAudioUrl,
        tempKey
          ? {
              audioEncoding: "LINEAR16_PCM",
              sampleRateHertz: yandexSampleRateHertz,
            }
          : undefined,
      ),
      Promise.allSettled(
        huggingFaceModels.map((model) =>
          transcribeWithHuggingFace(processedAudioUrl, model),
        ),
      ),
      getAudioDurationFromUrl(processedAudioUrl),
    ]);

  const assemblyai =
    assemblyaiResult.status === "fulfilled" ? assemblyaiResult.value : null;
  const yandex =
    yandexResult.status === "fulfilled" ? yandexResult.value : null;

  const huggingFaceAttemptResults =
    huggingFaceResults.status === "fulfilled" ? huggingFaceResults.value : [];

  const huggingFaceSuccessful = huggingFaceAttemptResults.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
  const huggingFaceBest =
    huggingFaceSuccessful.length > 0
      ? huggingFaceSuccessful.reduce((best, current) => {
          // AssemblyAI может отдавать confidence; HuggingFace — пока нет.
          // Поэтому при равном/отсутствующем confidence используем length как эвристику.
          const bestConfidence = best.confidence ?? -Infinity;
          const currentConfidence = current.confidence ?? -Infinity;

          if (currentConfidence !== bestConfidence) {
            return currentConfidence > bestConfidence ? current : best;
          }

          return current.text.length > best.text.length ? current : best;
        })
      : null;

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

  // Note: huggingFaceAttemptResults already is PromiseSettledResult[] (from inner Promise.allSettled)
  const errors: string[] = [];
  for (const result of huggingFaceAttemptResults) {
    if (result.status === "rejected") {
      errors.push(
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      );
    }
  }
  // Mimic previous behavior: if outer promise was rejected, also push its reason.
  if (huggingFaceResults.status === "rejected") {
    errors.push(
      huggingFaceResults.reason instanceof Error
        ? huggingFaceResults.reason.message
        : String(huggingFaceResults.reason),
    );
  }

  const huggingFaceModelCount = huggingFaceModels.length;
  const huggingFaceSuccessCount = huggingFaceSuccessful.length;

  if (assemblyaiResult.status === "rejected") {
    logger.warn("AssemblyAI распознавание не удалось", {
      error: assemblyaiError,
    });
  }
  if (yandexResult.status === "rejected") {
    logger.warn("Yandex распознавание не удалось", { error: yandexError });
  }
  if (errors.length > 0) {
    logger.warn("Hugging Face распознавание не удалось", { errors });
  }

  if (!assemblyai && !yandex && !huggingFaceBest) {
    throw new Error(
      "Ни один ASR провайдер не вернул результат (проверьте API ключи)",
    );
  }

  const durationFromUrl =
    durationResult.status === "fulfilled" ? durationResult.value : undefined;

  return {
    assemblyai,
    yandex,
    assemblyaiError,
    yandexError,
    huggingFaceSuccessful,
    huggingFaceBest,
    huggingFaceErrors: errors,
    huggingFaceModelCount,
    huggingFaceSuccessCount,
    durationFromUrl,
  };
}
