/**
 * Диаризация и асинхронная транскрибация
 */

import { createLogger } from "~/logger";
import { downloadAudioFile } from "~/inngest/functions/transcribe-call/audio/download";
import {
  startAsyncDiarizedTranscription,
  waitForAsyncDiarizedResult,
} from "~/inngest/functions/transcribe-call/gigaam/client";
import { performDiarization } from "~/inngest/functions/transcribe-call/speakers/diarization";
import type { PreprocessResult } from "~/inngest/functions/transcribe-call/steps/preprocess-audio";
import type { AsrResult } from "~/inngest/functions/transcribe-call/types";
import type { TranscriptionSegmentSchema } from "~/inngest/functions/transcribe-call/schemas";
import type { z } from "zod";

const logger = createLogger("transcribe-call:diarize");

export interface DiarizeResult {
  segments: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
  transcript: string;
  processingTimeMs: number;
  diarizationSuccess: boolean;
  diarizationFailed: boolean;
}

export async function diarizeAndTranscribe(
  pipelineAudio: PreprocessResult,
  callId: string,
): Promise<DiarizeResult> {
  // Загружаем аудиофайл один раз
  const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

  // Сначала получаем сегменты диаризации в асинхронном режиме (только диаризация, без транскрибации)
  const diarizationResult = await performDiarization(buffer, filename, callId);

  // Если диаризация не удалась - возвращаем пустой результат
  if (!diarizationResult.success || diarizationResult.segments.length === 0) {
    logger.warn("Диаризация не удалась", { callId });
    return {
      segments: [],
      transcript: "",
      processingTimeMs: 0,
      diarizationSuccess: false,
      diarizationFailed: true,
    };
  }

  // Запускаем асинхронную транскрибацию с диаризацией (используем тот же buffer/filename)
  const segments = diarizationResult.segments.map((s: { start: number; end: number; speaker: string }) => ({
    start: s.start,
    end: s.end,
    speaker: s.speaker,
  }));

  const { taskId } = await startAsyncDiarizedTranscription(buffer, filename, segments);
  logger.info("Асинхронная диаризированная транскрибация запущена", { callId, taskId });

  const result = await waitForAsyncDiarizedResult(taskId);

  logger.info("Асинхронная диаризированная транскрибация завершена", {
    callId,
    taskId,
    segmentsCount: result.segments.length,
  });

  return {
    segments: result.segments.map((s) => ({
      speaker: s.speaker || "unknown",
      text: s.text,
      start: s.start,
      end: s.end,
    })),
    transcript: result.final_transcript,
    processingTimeMs: result.processing_time,
    diarizationSuccess: diarizationResult.success,
    diarizationFailed: !diarizationResult.success,
  };
}

export function convertToAsrResult(diarizeResult: DiarizeResult): AsrResult {
  return {
    segments: diarizeResult.segments.map((s) => ({
      speaker: s.speaker,
      text: s.text,
      start: s.start,
      end: s.end,
    })),
    transcript: diarizeResult.transcript,
    metadata: {
      asrLogs: [
        {
          provider: "gigaam-diarized-async",
          utterances: diarizeResult.segments.map((s) => ({
            text: s.text,
            start: s.start,
            end: s.end,
            speaker: s.speaker,
          })) as z.infer<typeof TranscriptionSegmentSchema>[],
          raw: diarizeResult,
        },
      ],
    },
  };
}
