import { parseGigaAmRaw } from "~/asr/pipeline/gigaam-raw";
import {
  ASR_LOG_ERROR_MAX_LENGTH,
  ASR_LOG_TEXT_MAX_LENGTH,
  truncateForLog,
} from "~/asr/pipeline/log-utils";
import type { AsrResult, AsrSource, TranscriptMetadata } from "~/asr/types";

export function buildTranscriptMetadata(input: {
  assemblyai: AsrResult | null;
  yandex: AsrResult | null;
  gigaAmSuccessful: AsrResult[];
  gigaAmBest: AsrResult | null;
  assemblyaiError?: string;
  yandexError?: string;
  gigaAmErrors: string[];
  durationFromUrl?: number;
  processingTimeMs: number;
}): TranscriptMetadata {
  const {
    assemblyai,
    yandex,
    gigaAmSuccessful,
    gigaAmBest,
    assemblyaiError,
    yandexError,
    gigaAmErrors,
    durationFromUrl,
    processingTimeMs,
  } = input;

  const assemblyaiText = assemblyai?.text?.trim() ?? "";
  const yandexText = yandex?.text?.trim() ?? "";
  const gigaAmTexts = gigaAmSuccessful
    .map((result) => result.text.trim())
    .filter(Boolean);
  const gigaAmText = gigaAmBest?.text?.trim() ?? "";

  const durationFromMetadata = durationFromUrl;
  const durationFromAssemblyai = assemblyai?.raw
    ? (assemblyai.raw as { durationInSeconds?: number }).durationInSeconds
    : undefined;
  const durationInSeconds =
    typeof durationFromMetadata === "number"
      ? durationFromMetadata
      : durationFromAssemblyai;

  const successfulProviders: AsrSource[] = [];
  if (assemblyaiText) successfulProviders.push("assemblyai");
  if (yandexText) successfulProviders.push("yandex");
  if (gigaAmTexts.length > 0) successfulProviders.push("gigaam");

  const asrSource: AsrSource =
    successfulProviders.length > 1
      ? "merged"
      : (successfulProviders[0] ?? "merged");

  return {
    asrSource,
    processingTimeMs,
    confidence: assemblyai?.confidence ?? yandex?.confidence,
    speakerCount: assemblyai?.utterances
      ? new Set(
          assemblyai.utterances
            .map((u) => u.speaker)
            // Защита на случай неожиданных пустых значений
            .filter(Boolean),
        ).size
      : 0,
    durationInSeconds:
      typeof durationInSeconds === "number" ? durationInSeconds : undefined,
    asrAssemblyai: assemblyai
      ? {
          text: assemblyaiText || undefined,
          confidence: assemblyai.confidence,
          hasUtterances: !!assemblyai.utterances?.length,
          processingTimeMs: assemblyai.processingTimeMs,
        }
      : undefined,
    asrYandex: yandex
      ? {
          text: yandexText || undefined,
          processingTimeMs: yandex.processingTimeMs,
        }
      : undefined,
    asrGigaAm: gigaAmBest
      ? {
          text: gigaAmText || undefined,
          confidence: gigaAmBest.confidence,
          hasUtterances: !!gigaAmBest.utterances?.length,
          processingTimeMs: gigaAmBest.processingTimeMs,
        }
      : undefined,
    asrLogs: [
      {
        provider: "assemblyai",
        success: !!assemblyai,
        processingTimeMs: assemblyai?.processingTimeMs,
        text: truncateForLog(assemblyaiText, ASR_LOG_TEXT_MAX_LENGTH),
        confidence: assemblyai?.confidence,
        utterances: undefined,
        raw: undefined,
        error: truncateForLog(assemblyaiError, ASR_LOG_ERROR_MAX_LENGTH),
      },
      {
        provider: "yandex",
        success: !!yandex,
        processingTimeMs: yandex?.processingTimeMs,
        text: truncateForLog(yandexText, ASR_LOG_TEXT_MAX_LENGTH),
        confidence: yandex?.confidence,
        utterances: undefined,
        raw: undefined,
        error: truncateForLog(yandexError, ASR_LOG_ERROR_MAX_LENGTH),
      },
      {
        provider: "gigaam",
        success: gigaAmSuccessful.length > 0,
        processingTimeMs: gigaAmBest?.processingTimeMs,
        text:
          gigaAmTexts.length > 0
            ? truncateForLog(
                gigaAmTexts.join("\n\n---\n\n"),
                ASR_LOG_TEXT_MAX_LENGTH,
              )
            : undefined,
        confidence: gigaAmBest?.confidence,
        utterances: undefined,
        raw: {
          runs: gigaAmSuccessful.length,
          details: gigaAmSuccessful.map((result) => {
            const raw = parseGigaAmRaw(result.raw);
            return {
              endpoint: raw?.endpoint,
              segmentCount: raw?.segmentCount,
              processingTimeMs: result.processingTimeMs,
              textLength: result.text.length,
            };
          }),
          errorCount: gigaAmErrors.length,
        },
        error:
          gigaAmErrors.length > 0
            ? truncateForLog(gigaAmErrors.join(" | "), ASR_LOG_ERROR_MAX_LENGTH)
            : undefined,
      },
    ],
  };
}
