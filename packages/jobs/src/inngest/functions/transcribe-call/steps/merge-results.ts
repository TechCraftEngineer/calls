/**
 * LLM Merging: объединение синхронного non-diarized с асинхронным diarized
 */

import { createLogger } from "../../../../logger";
import { applyLLMMerging } from "../llm-merge";
import type { SyncTranscriptionResult } from "./sync-transcription";
import type { DiarizeResult } from "./diarize-and-transcribe";

const logger = createLogger("transcribe-call:merge");

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
): Promise<MergeResult> {
  const llmMergeStartTime = Date.now();

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

  const mergeResult = await applyLLMMerging(
    {
      transcript: fullTranscription.transcript,
    },
    diarizedAsrResult,
    callId,
  );

  const llmMergeTimeMs = Date.now() - llmMergeStartTime;

  return {
    segments: mergeResult.segments,
    mergedTranscript: mergeResult.mergedTranscript,
    applied: mergeResult.applied,
    qualityScore: mergeResult.quality?.score ?? null,
    fallbackReason: mergeResult.fallbackReason,
    llmMergeTimeMs,
  };
}
