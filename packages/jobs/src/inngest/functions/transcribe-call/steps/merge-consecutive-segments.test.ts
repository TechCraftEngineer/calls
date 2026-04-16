/**
 * Тесты для функции объединения последовательных сегментов одного спикера
 */

import { describe, expect, it } from "vitest";
import { mergeConsecutiveSpeakerSegments, type Segment } from "./merge-consecutive-segments";

describe("mergeConsecutiveSpeakerSegments", () => {
  it("должен объединять последовательные сегменты одного спикера", () => {
    const segments: Segment[] = [
      { speaker: "SPEAKER_00", start: 0, end: 2, text: "Привет" },
      { speaker: "SPEAKER_00", start: 2, end: 4, text: "как дела?" },
      { speaker: "SPEAKER_01", start: 4, end: 6, text: "Отлично" },
      { speaker: "SPEAKER_01", start: 6, end: 8, text: "спасибо" },
    ];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      speaker: "SPEAKER_00",
      start: 0,
      end: 4,
      text: "Привет как дела?",
      confidence: undefined,
    });
    expect(result[1]).toEqual({
      speaker: "SPEAKER_01",
      start: 4,
      end: 8,
      text: "Отлично спасибо",
      confidence: undefined,
    });
  });

  it("должен обрабатывать чередующихся спикеров", () => {
    const segments: Segment[] = [
      { speaker: "SPEAKER_00", start: 0, end: 2, text: "Привет" },
      { speaker: "SPEAKER_01", start: 2, end: 4, text: "Привет" },
      { speaker: "SPEAKER_00", start: 4, end: 6, text: "Как дела?" },
      { speaker: "SPEAKER_01", start: 6, end: 8, text: "Хорошо" },
    ];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.speaker)).toEqual([
      "SPEAKER_00",
      "SPEAKER_01",
      "SPEAKER_00",
      "SPEAKER_01",
    ]);
  });

  it("должен пропускать пустые сегменты", () => {
    const segments: Segment[] = [
      { speaker: "SPEAKER_00", start: 0, end: 2, text: "Привет" },
      { speaker: "SPEAKER_00", start: 2, end: 4, text: "" },
      { speaker: "SPEAKER_00", start: 4, end: 6, text: "как дела?" },
    ];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      speaker: "SPEAKER_00",
      start: 0,
      end: 6,
      text: "Привет как дела?",
      confidence: undefined,
    });
  });

  it("должен усреднять confidence при объединении", () => {
    const segments: Segment[] = [
      { speaker: "SPEAKER_00", start: 0, end: 2, text: "Привет", confidence: 0.9 },
      { speaker: "SPEAKER_00", start: 2, end: 4, text: "как дела?", confidence: 0.8 },
    ];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBeCloseTo(0.85, 2);
  });

  it("должен обрабатывать пустой массив", () => {
    const result = mergeConsecutiveSpeakerSegments([]);
    expect(result).toEqual([]);
  });

  it("должен обрабатывать один сегмент", () => {
    const segments: Segment[] = [{ speaker: "SPEAKER_00", start: 0, end: 2, text: "Привет" }];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      speaker: "SPEAKER_00",
      start: 0,
      end: 2,
      text: "Привет",
      confidence: undefined,
    });
  });

  it("должен сортировать сегменты по времени начала", () => {
    const segments: Segment[] = [
      { speaker: "SPEAKER_00", start: 4, end: 6, text: "как дела?" },
      { speaker: "SPEAKER_00", start: 0, end: 2, text: "Привет" },
      { speaker: "SPEAKER_00", start: 2, end: 4, text: "там" },
    ];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      speaker: "SPEAKER_00",
      start: 0,
      end: 6,
      text: "Привет там как дела?",
      confidence: undefined,
    });
  });

  it("должен объединять много последовательных сегментов одного спикера", () => {
    const segments: Segment[] = [
      { speaker: "SPEAKER_00", start: 0, end: 1, text: "Раз" },
      { speaker: "SPEAKER_00", start: 1, end: 2, text: "два" },
      { speaker: "SPEAKER_00", start: 2, end: 3, text: "три" },
      { speaker: "SPEAKER_00", start: 3, end: 4, text: "четыре" },
      { speaker: "SPEAKER_00", start: 4, end: 5, text: "пять" },
    ];

    const result = mergeConsecutiveSpeakerSegments(segments);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      speaker: "SPEAKER_00",
      start: 0,
      end: 5,
      text: "Раз два три четыре пять",
      confidence: undefined,
    });
  });
});
