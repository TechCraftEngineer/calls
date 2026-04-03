/**
 * Идентификация спикеров через LLM
 */

import { identifySpeakersWithEmbeddings } from "@calls/asr/llm/identify-speakers-with-embeddings";
import { extractSegmentsFromUtterances, extractSpeakerTimeline } from "./extraction";

export async function identifySpeakers(
  call: {
    direction: string;
    name?: string | null;
    workspaceId: string;
  },
  result: {
    normalizedText: string;
    metadata: {
      asrLogs?: Array<{
        provider: string;
        utterances?: unknown[];
        raw?: unknown;
      }>;
    };
  },
  managerNameFromPbx: string | null,
) {
  const fallbackManagerName = call.name?.trim() || null;

  // Извлекаем данные из giga-am результата
  const gigaAmLog = result.metadata.asrLogs?.find(
    (log) => log.provider === "gigaam-diarized" || log.provider === "gigaam",
  );
  const gigaAmRaw = gigaAmLog?.raw;

  // Безопасно извлекаем speaker_timeline
  const speakerTimeline = extractSpeakerTimeline(gigaAmRaw);

  // Извлекаем utterances с эмбеддингами и confidence
  const utterances = gigaAmLog?.utterances;
  const segments = extractSegmentsFromUtterances(utterances || []);

  return identifySpeakersWithEmbeddings(result.normalizedText, {
    direction: call.direction,
    managerName: managerNameFromPbx ?? fallbackManagerName,
    workspaceId: call.workspaceId,
    speakerTimeline,
    segments: segments || [],
  });
}
