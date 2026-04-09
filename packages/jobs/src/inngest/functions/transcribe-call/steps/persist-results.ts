/**
 * Сохранение результатов транскрибации
 */

import { callsService } from "@calls/db";
import { createLogger } from "~/logger";
import { serializeMetadata } from "~/inngest/functions/transcribe-call/utils/metadata";
import type { MergeResult } from "~/inngest/functions/transcribe-call/steps/merge-results";
import type { SummarizeResult } from "./summarize";
import type { IdentifyResult } from "./identify-speakers";
import type { Call } from "~/inngest/functions/transcribe-call/schemas";

const logger = createLogger("transcribe-call:persist");

export interface PersistParams {
  call: Call;
  finalText: string;
  rawText: string;
  mergedResult: MergeResult;
  summaryResult: SummarizeResult;
  identifyResult: IdentifyResult;
  totalProcessingTimeMs: number;
  asrSource: string;
  confidence?: number | null;
}

export async function persistResults({
  call,
  finalText,
  rawText,
  mergedResult,
  summaryResult,
  identifyResult,
  totalProcessingTimeMs,
  asrSource,
  confidence,
}: PersistParams): Promise<void> {
  const serializedMetadata = serializeMetadata(
    {
      asrLogs: [],
      asrSource,
      processingTimeMs: totalProcessingTimeMs,
      confidence,
    },
    identifyResult.metadata,
    identifyResult.operatorName,
  );

  await callsService.upsertTranscript({
    callId: call.id,
    text: finalText,
    rawText,
    confidence,
    metadata: {
      ...serializedMetadata,
      processingTimeMs: totalProcessingTimeMs,
      llmMergeApplied: mergedResult.applied,
      llmMergeQuality: mergedResult.qualityScore,
    },
    summary: summaryResult.summary,
    sentiment: summaryResult.sentiment,
    title: summaryResult.title,
    callType: summaryResult.callType,
    callTopic: summaryResult.callTopic,
    customerName: identifyResult.customerName ?? undefined,
  });

  logger.info("Транскрипт сохранен", {
    callId: call.id,
    textLength: finalText.length,
    hasSummary: !!summaryResult.summary,
    customerName: identifyResult.customerName,
  });
}
