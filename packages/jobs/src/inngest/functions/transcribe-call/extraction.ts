/**
 * Извлечение данных из результатов ASR
 */

import type { GigaAmSegment, SpeakerTimelineItem } from "./types";

export function extractSpeakerTimeline(gigaAmRaw: unknown):
  | SpeakerTimelineItem[]
  | undefined {
  const raw = gigaAmRaw as { speakerTimeline?: unknown } | undefined;

  if (!raw?.speakerTimeline || !Array.isArray(raw.speakerTimeline)) {
    return undefined;
  }

  return raw.speakerTimeline.map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const entry = item as Record<string, unknown>;
      return {
        speaker: typeof entry.speaker === "string" ? entry.speaker : "SPEAKER_01",
        start: typeof entry.start === "number" ? entry.start : 0,
        end: typeof entry.end === "number" ? entry.end : 0,
        text: typeof entry.text === "string" ? entry.text : "",
        overlap: typeof entry.overlap === "boolean" ? entry.overlap : undefined,
      };
    }
    return {
      speaker: "SPEAKER_01",
      start: 0,
      end: 0,
      text: "",
    };
  });
}

export function extractSegmentsFromUtterances(utterances: unknown[]):
  | GigaAmSegment[]
  | undefined {
  if (!Array.isArray(utterances)) {
    return undefined;
  }

  return utterances.map((u) => {
    const utterance = u as Record<string, unknown>;
    const embedding = Array.isArray(utterance.embedding)
      ? (utterance.embedding as number[])
      : undefined;
    const confidence = typeof utterance.confidence === "number" ? utterance.confidence : undefined;
    return {
      speaker: typeof utterance.speaker === "string" ? utterance.speaker : "",
      start: typeof utterance.start === "number" ? utterance.start : 0,
      end: typeof utterance.end === "number" ? utterance.end : 0,
      text: typeof utterance.text === "string" ? utterance.text : "",
      embedding,
      confidence,
    };
  });
}
