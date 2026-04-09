/**
 * Диаризация и транскрибация аудио через GigaAM API
 *
 * Использует встроенную диаризацию GigaAM, без speaker-embeddings сервиса.
 * Синхронная модель через performDiarization УБРАНА.
 */

import { createLogger } from "~/logger";
import type { AsrResult } from "~/inngest/functions/transcribe-call/types";
import {
  processAudioWithoutDiarization,
  startAsyncDiarizedTranscription,
  waitForAsyncDiarizedResult,
} from "~/inngest/functions/transcribe-call/gigaam/client";

const logger = createLogger("gigaam-diarization");

/**
 * Обрабатывает аудио с диаризацией через GigaAM
 * Использует встроенную диаризацию GigaAM (без speaker-embeddings)
 */
export async function processAudioWithDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<AsrResult> {
  const requestStartTime = Date.now();

  try {
    logger.info("Начало диаризации и транскрибации через GigaAM", { filename });

    // Используем GigaAM диаризированную транскрибацию напрямую
    // GigaAM имеет встроенную диаризацию
    const { taskId } = await startAsyncDiarizedTranscription(
      audioBuffer,
      filename,
      [], // Пустые сегменты - GigaAM сам сделает диаризацию
    );

    const diarizedResult = await waitForAsyncDiarizedResult(taskId);

    const processingTime = Date.now() - requestStartTime;

    // Конвертируем результат в стандартный AsrResult формат
    const transcribedSegments = diarizedResult.segments.map((seg: {
      text: string;
      start: number;
      end: number;
      speaker?: string;
      confidence: number;
    }) => ({
      speaker: seg.speaker ?? "UNKNOWN",
      start: seg.start,
      end: seg.end,
      text: seg.text,
      confidence: seg.confidence,
    }));

    logger.info("Диаризация и транскрибация завершена", {
      filename,
      segmentsCount: transcribedSegments.length,
      numSpeakers: diarizedResult.num_speakers,
      processingTime,
      gigaProcessingTime: diarizedResult.processing_time,
    });

    return {
      segments: transcribedSegments,
      transcript: diarizedResult.final_transcript,
      metadata: {
        asrLogs: [
          {
            provider: "gigaam-diarized",
            utterances: transcribedSegments,
            raw: {
              num_speakers: diarizedResult.num_speakers,
              speakers: diarizedResult.speakers,
              segments: transcribedSegments,
              processingTime,
              gigaProcessingTime: diarizedResult.processing_time,
              pipeline: diarizedResult.pipeline,
            },
          },
        ],
      },
    };
  } catch (error) {
    logger.error("Ошибка обработки с диаризацией", {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback на обычную транскрипцию
    return processAudioWithoutDiarization(audioBuffer, filename);
  }
}
