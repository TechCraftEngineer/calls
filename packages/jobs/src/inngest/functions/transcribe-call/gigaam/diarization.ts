/**
 * Диаризация аудио через speaker-embeddings сервис
 *
 * ИСПОЛЬЗУЕТ НОВЫЙ БАТЧЕВЫЙ ENDPOINT /api/transcribe-diarized
 * Вместо N+1 HTTP-запросов для каждого сегмента, отправляем один запрос
 * с полным аудио и сегментами. Python сервис нарезает и транскрибирует
 * параллельно с ограничением concurrency.
 */

import { createLogger } from "../../../../logger";
import { checkSpeakerEmbeddingsHealth, performDiarizationAuto } from "../speaker-diarization";
import type { AsrResult } from "../types";
import {
  type DiarizationSegmentInput,
  processAudioWithDiarizationAuto,
  processAudioWithoutDiarization,
} from "./client";

const logger = createLogger("gigaam-diarization");

export async function processAudioWithDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<AsrResult> {
  const requestStartTime = Date.now();

  try {
    logger.info("Начало диаризации аудио", { filename });

    // Health check перед диаризацией
    const healthStatus = await checkSpeakerEmbeddingsHealth();
    if (!healthStatus) {
      logger.warn("Speaker-embeddings сервис недоступен, пропускаем диаризацию");
      return processAudioWithoutDiarization(audioBuffer, filename);
    }

    // Шаг 1: Диаризация через speaker-embeddings
    const diarizationResult = await performDiarizationAuto(audioBuffer, filename);

    if (!diarizationResult.success || diarizationResult.segments.length === 0) {
      logger.warn("Диаризация не удалась, используем обычную транскрипцию", {
        filename,
        segmentsCount: diarizationResult.segments.length,
      });

      // Fallback на обычную транскрипцию
      return processAudioWithoutDiarization(audioBuffer, filename);
    }

    logger.info("Диаризация завершена", {
      segmentsCount: diarizationResult.segments.length,
      numSpeakers: diarizationResult.num_speakers,
      speakers: diarizationResult.speakers,
    });

    // Шаг 2: Транскрибируем все сегменты через батчевый endpoint (ОДИН HTTP-зАПРОС!)
    const segmentsInput: DiarizationSegmentInput[] = diarizationResult.segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      speaker: seg.speaker,
    }));

    logger.info("Отправка на батчевую транскрипцию", {
      filename,
      segmentsCount: segmentsInput.length,
    });

    const diarizedResult = await processAudioWithDiarizationAuto(
      audioBuffer,
      filename,
      segmentsInput,
    );

    const processingTime = Date.now() - requestStartTime;

    // Конвертируем результат в стандартный AsrResult формат
    const transcribedSegments = diarizedResult.segments.map((seg) => ({
      speaker: seg.speaker ?? "UNKNOWN",
      start: seg.start,
      end: seg.end,
      text: seg.text,
      confidence: seg.confidence,
    }));

    logger.info("Батчевая транскрипция завершена", {
      filename,
      segmentsCount: transcribedSegments.length,
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
              diarization: {
                num_speakers: diarizationResult.num_speakers,
                speakers: diarizationResult.speakers,
                segments: transcribedSegments,
              },
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
