/**
 * Утилита для объединения последовательных сегментов одного и того же спикера.
 * Это улучшает читаемость диалогов, избегая фрагментации речи одного человека.
 */

import { createLogger } from "../../../../logger";

const logger = createLogger("transcribe-call:merge-segments");

export interface Segment {
  speaker: string;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

/**
 * Объединяет последовательные сегменты одного и того же спикера в один интервал.
 *
 * @param segments - Массив сегментов для объединения
 * @param callId - ID звонка для логирования
 * @returns Массив объединённых сегментов
 */
export function mergeConsecutiveSpeakerSegments(segments: Segment[], callId?: string): Segment[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  // Сортируем сегменты по времени начала на всякий случай
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

  const mergedSegments: Segment[] = [];
  let currentSegment: Segment | null = null;

  for (const segment of sortedSegments) {
    // Пропускаем пустые сегменты
    if (!segment.text || segment.text.trim().length === 0) {
      continue;
    }

    // Если это первый сегмент или спикер изменился
    if (!currentSegment || currentSegment.speaker !== segment.speaker) {
      // Сохраняем предыдущий сегмент, если он есть
      if (currentSegment) {
        mergedSegments.push(currentSegment);
      }

      // Начинаем новый сегмент
      currentSegment = {
        speaker: segment.speaker,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        confidence: segment.confidence,
      };
    } else {
      // Тот же спикер - объединяем
      currentSegment.end = segment.end;
      currentSegment.text = `${currentSegment.text} ${segment.text}`;

      // Усредняем confidence, если он есть
      if (currentSegment.confidence !== undefined && segment.confidence !== undefined) {
        currentSegment.confidence = (currentSegment.confidence + segment.confidence) / 2;
      }
    }
  }

  // Добавляем последний сегмент
  if (currentSegment) {
    mergedSegments.push(currentSegment);
  }

  if (callId) {
    logger.info("Объединение последовательных сегментов одного спикера", {
      callId,
      originalCount: segments.length,
      mergedCount: mergedSegments.length,
      reductionPercent: Math.round(
        ((segments.length - mergedSegments.length) / segments.length) * 100,
      ),
    });
  }

  return mergedSegments;
}
