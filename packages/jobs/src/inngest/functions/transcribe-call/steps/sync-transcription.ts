/**
 * Синхронная полная транскрибация (без диаризации)
 */

import { createLogger } from "~/logger";
import { downloadAudioFile } from "~/inngest/functions/transcribe-call/audio/download";
import { processAudioWithGigaAm } from "~/inngest/functions/transcribe-call/gigaam/client";
import type { PreprocessResult } from "./preprocess-audio";

const logger = createLogger("transcribe-call:sync-transcription");

export interface SyncTranscriptionResult {
  transcript: string;
  processingTimeMs: number;
  segments?: Array<{
    speaker: string;
    start: number;
    end: number;
    text: string;
  }>;
}

export async function syncTranscription(
  pipelineAudio: PreprocessResult,
  callId: string,
): Promise<SyncTranscriptionResult> {
  const asrStartTime = Date.now();

  const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

  logger.info("Запуск синхронной полной транскрибации", {
    callId,
    durationSeconds: pipelineAudio.durationSeconds,
  });

  const result = await processAudioWithGigaAm(buffer, filename);
  const processingTimeMs = Date.now() - asrStartTime;

  logger.info("Синхронная транскрибация завершена", {
    callId,
    processingTimeMs,
    transcriptLength: result.transcript.length,
  });

  return {
    transcript: result.transcript,
    segments: result.segments,
    processingTimeMs,
  };
}
