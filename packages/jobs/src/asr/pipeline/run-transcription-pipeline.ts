import { createLogger } from "~/logger";
import {
  type PreprocessingResult,
  safeAudioUrlParts,
} from "../audio/audio-preprocessing";
import { mergeAsrWithLlm } from "../llm/merge-asr";
import type { PipelineResult } from "../types";
import { buildTranscriptMetadata } from "./build-metadata";
import { postProcessText } from "./post-process";
import { runAsrProviders } from "./run-asr-providers";

const logger = createLogger("asr-pipeline");

export async function runTranscriptionPipelineFromAsrAudio(
  asrAudioUrl: string,
  preprocessingResult:
    | PreprocessingResult
    | Pick<
        PreprocessingResult,
        "audioUrl" | "wasProcessed" | "appliedFilters" | "processingTimeMs"
      >
    | null,
  options?: {
    skipNormalization?: boolean;
    skipContextCorrection?: boolean;
    summaryPrompt?: string;
    companyContext?: string | null;
    gigaPreprocessMetadata?: Record<string, unknown> | null;
  },
): Promise<PipelineResult> {
  const start = Date.now();
  const safeIn = safeAudioUrlParts(asrAudioUrl);
  logger.info("Запуск конвейера распознавания", {
    host: safeIn.host,
    basename: safeIn.basename,
  });

  const asr = await runAsrProviders(asrAudioUrl, {
    gigaPreprocessMetadata: options?.gigaPreprocessMetadata,
  });

  const gigaAmTexts = asr.gigaAmSuccessful
    .map((result) => result.text.trim())
    .filter(Boolean);
  const gigaAmText = asr.gigaAmBest?.text?.trim() ?? "";

  const gigaRaw = asr.gigaAmBest?.raw as
    | { ultraPipeline?: boolean }
    | undefined;
  const isUltraPipeline = Boolean(gigaRaw?.ultraPipeline);

  const rawText = isUltraPipeline
    ? gigaAmText
    : await mergeAsrWithLlm({
        gigaAmText: gigaAmText || undefined,
        gigaAmTexts,
      });

  const post = await postProcessText({
    rawText,
    startTs: start,
    options: {
      skipNormalization: isUltraPipeline || options?.skipNormalization,
      skipContextCorrection: isUltraPipeline || options?.skipContextCorrection,
      summaryPrompt: options?.summaryPrompt,
      companyContext: options?.companyContext,
    },
  });

  const metadata = buildTranscriptMetadata({
    gigaAmSuccessful: asr.gigaAmSuccessful,
    gigaAmBest: asr.gigaAmBest,
    gigaAmErrors: asr.gigaAmErrors,
    durationFromUrl: asr.durationFromUrl,
    processingTimeMs: post.processingTimeMs,
  });

  logger.info("Конвейер завершён", {
    processingTimeMs: post.processingTimeMs,
    asrSource: metadata.asrSource,
    rawLength: rawText.length,
    contextCorrectedLength: post.contextCorrectedText.length,
    normalizedLength: post.normalizedText.length,
    hasSummary: !!post.summary,
    hasGigaAm: asr.gigaAmSuccessful.length > 0,
    gigaAmProviderCount: asr.gigaAmProviderCount,
    gigaAmSuccessCount: asr.gigaAmSuccessCount,
    contextCorrectionApplied: post.contextCorrectionApplied,
    audioPreprocessed: preprocessingResult?.wasProcessed ?? false,
    hasEnhancedAudio: !!preprocessingResult?.wasProcessed,
  });

  return {
    rawText,
    normalizedText: post.normalizedText,
    metadata,
    summary: post.summary,
    sentiment: post.sentiment,
    title: post.title,
    callType: post.callType,
    callTopic: post.callTopic,
  };
}
