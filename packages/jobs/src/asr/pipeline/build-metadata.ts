import type { AsrResult, AsrSource, TranscriptMetadata } from "../types";
import { parseHuggingFaceRaw } from "./huggingface-raw";
import {
  ASR_LOG_ERROR_MAX_LENGTH,
  ASR_LOG_TEXT_MAX_LENGTH,
  truncateForLog,
} from "./log-utils";

export function buildTranscriptMetadata(input: {
  assemblyai: AsrResult | null;
  yandex: AsrResult | null;
  huggingFaceSuccessful: AsrResult[];
  huggingFaceBest: AsrResult | null;
  assemblyaiError?: string;
  yandexError?: string;
  huggingFaceErrors: string[];
  durationFromUrl?: number;
  processingTimeMs: number;
}): TranscriptMetadata {
  const {
    assemblyai,
    yandex,
    huggingFaceSuccessful,
    huggingFaceBest,
    assemblyaiError,
    yandexError,
    huggingFaceErrors,
    durationFromUrl,
    processingTimeMs,
  } = input;

  const assemblyaiText = assemblyai?.text?.trim() ?? "";
  const yandexText = yandex?.text?.trim() ?? "";
  const huggingFaceTexts = huggingFaceSuccessful
    .map((result) => result.text.trim())
    .filter(Boolean);
  const huggingFaceText = huggingFaceBest?.text?.trim() ?? "";

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
  if (huggingFaceTexts.length > 0) successfulProviders.push("huggingface");

  const asrSource: AsrSource =
    successfulProviders.length > 1
      ? "merged"
      : (successfulProviders[0] ?? "merged");

  return {
    asrSource,
    processingTimeMs,
    confidence: assemblyai?.confidence ?? yandex?.confidence,
    speakerCount: assemblyai?.utterances?.length,
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
    asrHuggingFace: huggingFaceBest
      ? {
          text: huggingFaceText || undefined,
          confidence: huggingFaceBest.confidence,
          hasUtterances: !!huggingFaceBest.utterances?.length,
          processingTimeMs: huggingFaceBest.processingTimeMs,
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
        provider: "huggingface",
        success: huggingFaceSuccessful.length > 0,
        processingTimeMs: huggingFaceBest?.processingTimeMs,
        text:
          huggingFaceTexts.length > 0
            ? truncateForLog(
                huggingFaceTexts.join("\n\n---\n\n"),
                ASR_LOG_TEXT_MAX_LENGTH,
              )
            : undefined,
        confidence: huggingFaceBest?.confidence,
        utterances: undefined,
        raw: {
          modelCount: huggingFaceSuccessful.length,
          models: huggingFaceSuccessful.map((result) => {
            const raw = parseHuggingFaceRaw(result.raw);
            return {
              model: raw?.model,
              revision: raw?.revision,
              processingTimeMs: result.processingTimeMs,
              textLength: result.text.length,
            };
          }),
          errorCount: huggingFaceErrors.length,
        },
        error:
          huggingFaceErrors.length > 0
            ? truncateForLog(
                huggingFaceErrors.join(" | "),
                ASR_LOG_ERROR_MAX_LENGTH,
              )
            : undefined,
      },
    ],
  };
}
