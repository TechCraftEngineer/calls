/**
 * LLM Merging: объединение синхронного non-diarized с асинхронным diarized
 */

import { buildCompanyContext } from "@calls/shared";
import { createLogger } from "../../../../logger";
import { applyLLMMerging } from "../llm/merge";
import type { Workspace } from "../schemas";
import { mergeConsecutiveSpeakerSegments } from "./merge-consecutive-segments";
import type { SyncTranscriptionResult } from "./sync-transcription";

const logger = createLogger("transcribe-call:merge-results");

// Интерфейс результата диаризации
export interface DiarizeResult {
  segments: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  transcript: string;
  processingTimeMs: number;
  diarizationSuccess: boolean;
  diarizationFailed: boolean;
}

export interface MergeResult {
  segments: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
  mergedTranscript: string;
  applied: boolean;
  qualityScore: number | null;
  fallbackReason?: string;
  llmMergeTimeMs: number;
}

export async function mergeResults(
  fullTranscription: SyncTranscriptionResult,
  diarizedResult: DiarizeResult,
  callId: string,
  workspace: Workspace,
): Promise<MergeResult> {
  const llmMergeStartTime = Date.now();
  const companyContext = buildCompanyContext(workspace);

  // Конвертируем DiarizeResult в формат AsrResult для совместимости
  const diarizedAsrResult = {
    segments: diarizedResult.segments.map((s) => ({
      speaker: s.speaker,
      text: s.text,
      start: s.start,
      end: s.end,
    })),
    transcript: diarizedResult.transcript,
    metadata: {
      asrLogs: [
        {
          provider: "gigaam-diarized-async",
          utterances: diarizedResult.segments.map((s) => ({
            text: s.text,
            start: s.start,
            end: s.end,
            speaker: s.speaker,
          })),
          raw: diarizedResult,
        },
      ],
    },
  };

  logger.info("Starting LLM merge with company context", {
    callId,
    hasCompanyContext: !!companyContext,
    companyName: workspace.name,
  });

  const mergeResult = await applyLLMMerging(
    {
      transcript: fullTranscription.transcript,
    },
    diarizedAsrResult,
    callId,
    companyContext,
  );

  const llmMergeTimeMs = Date.now() - llmMergeStartTime;

  // Объединяем последовательные сегменты одного спикера в финальном результате
  const finalSegments = mergeConsecutiveSpeakerSegments(mergeResult.segments, callId);

  return {
    segments: finalSegments,
    mergedTranscript: mergeResult.mergedTranscript,
    applied: mergeResult.applied,
    qualityScore: mergeResult.quality?.score ?? null,
    fallbackReason: mergeResult.fallbackReason,
    llmMergeTimeMs,
  };
}
