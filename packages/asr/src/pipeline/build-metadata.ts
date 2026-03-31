import type { AsrResult, AsrSource, TranscriptMetadata } from "../types";
import { parseGigaAmRaw } from "./gigaam-raw";
import { ASR_LOG_ERROR_MAX_LENGTH, ASR_LOG_TEXT_MAX_LENGTH, truncateForLog } from "./log-utils";

export function buildTranscriptMetadata(input: {
  gigaAmSuccessful: AsrResult[];
  gigaAmBest: AsrResult | null;
  gigaAmErrors: string[];
  durationFromUrl?: number;
  processingTimeMs: number;
}): TranscriptMetadata {
  const { gigaAmSuccessful, gigaAmBest, gigaAmErrors, durationFromUrl, processingTimeMs } = input;

  const gigaAmTexts = gigaAmSuccessful.map((result) => result.text.trim()).filter(Boolean);
  const gigaAmText = gigaAmBest?.text?.trim() ?? "";

  const durationFromGigaRaw = gigaAmBest?.raw
    ? (gigaAmBest.raw as { totalDuration?: number }).totalDuration
    : undefined;
  const durationInSeconds =
    typeof durationFromUrl === "number"
      ? durationFromUrl
      : typeof durationFromGigaRaw === "number"
        ? durationFromGigaRaw
        : undefined;

  const asrSource: AsrSource = "gigaam";

  return {
    asrSource,
    processingTimeMs,
    confidence: gigaAmBest?.confidence,
    speakerCount: gigaAmBest?.utterances
      ? new Set(gigaAmBest.utterances.map((u) => u.speaker).filter(Boolean)).size
      : undefined,
    durationInSeconds: typeof durationInSeconds === "number" ? durationInSeconds : undefined,
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
        provider: "gigaam",
        success: gigaAmSuccessful.length > 0,
        processingTimeMs: gigaAmBest?.processingTimeMs,
        text:
          gigaAmTexts.length > 0
            ? truncateForLog(gigaAmTexts.join("\n\n---\n\n"), ASR_LOG_TEXT_MAX_LENGTH)
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
