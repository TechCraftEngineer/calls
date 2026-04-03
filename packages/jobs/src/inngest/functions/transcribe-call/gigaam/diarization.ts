/**
 * Диаризация аудио через speaker-embeddings сервис
 */

import { createLogger } from "../../../../logger";
import { processAudioWithoutDiarization } from "./client";
import { extractAudioSegment } from "../audio/processing";
import { performDiarization } from "../speaker-diarization";
import type { AsrResult } from "../types";

const logger = createLogger("gigaam-diarization");

export async function processAudioWithDiarization(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<AsrResult> {
  const requestStartTime = Date.now();

  try {
    logger.info("Начало диаризации аудио", { filename });

    // Шаг 1: Диаризация через speaker-embeddings
    const diarizationResult = await performDiarization(audioBuffer, filename);

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

    // Шаг 2: Транскрибируем каждый сегмент через GigaAM
    const transcribedSegments = [];

    for (const segment of diarizationResult.segments) {
      try {
        // Извлекаем аудио для сегмента
        const segmentAudio = await extractAudioSegment(audioBuffer, segment.start, segment.end);

        // Транскрибируем сегмент
        const segmentResult = await processAudioWithoutDiarization(
          segmentAudio,
          `segment_${segment.start}_${segment.end}.wav`,
        );

        if (segmentResult.transcript) {
          transcribedSegments.push({
            speaker: segment.speaker,
            start: segment.start,
            end: segment.end,
            text: segmentResult.transcript,
            confidence: segmentResult.metadata?.asrLogs?.[0]?.utterances?.[0]?.confidence || 1.0,
          });
        } else {
          // Пустой сегмент если транскрипция не удалась
          transcribedSegments.push({
            speaker: segment.speaker,
            start: segment.start,
            end: segment.end,
            text: "",
            confidence: 0.0,
          });
        }
      } catch (error) {
        logger.warn(`Ошибка транскрипции сегмента ${segment.start}-${segment.end}s`, {
          error: error instanceof Error ? error.message : String(error),
        });

        // Добавляем пустой сегмент при ошибке
        transcribedSegments.push({
          speaker: segment.speaker,
          start: segment.start,
          end: segment.end,
          text: "",
          confidence: 0.0,
        });
      }
    }

    const processingTime = Date.now() - requestStartTime;

    // Собираем полный текст
    const fullTranscript = transcribedSegments
      .map((seg) => seg.text)
      .join(" ")
      .trim();

    return {
      segments: transcribedSegments,
      transcript: fullTranscript,
      metadata: {
        asrLogs: [
          {
            provider: "gigaam-diarized",
            utterances: transcribedSegments,
            raw: {
              diarization: diarizationResult,
              processingTime,
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
