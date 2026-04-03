/**
 * Идентификация спикеров через LLM
 */

import { identifySpeakersWithEmbeddings } from "@calls/asr/llm/identify-speakers-with-embeddings";
import { z } from "zod";
import { extractSegmentsFromUtterances, extractSpeakerTimeline } from "./extraction";

// Zod схема для валидации входных данных identifySpeakersWithEmbeddings
const IdentifySpeakersInputSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.string().max(500).optional(),
  conversationHistory: z.array(z.string()).max(20).optional(),
});

// Максимальная длина текста для идентификации спикеров
const MAX_MESSAGE_LENGTH = 2000;

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

  // Валидация и truncation входного текста
  let normalizedText = result.normalizedText;
  const originalLength = normalizedText.length;
  
  if (normalizedText.length > MAX_MESSAGE_LENGTH) {
    normalizedText = normalizedText.substring(0, MAX_MESSAGE_LENGTH);
    console.warn(`[speaker-identification] Текст обрезан с ${originalLength} до ${MAX_MESSAGE_LENGTH} символов`);
  }
  
  // Zod валидация входных данных
  const validationResult = IdentifySpeakersInputSchema.safeParse({
    message: normalizedText,
    context: fallbackManagerName || undefined,
    conversationHistory: undefined,
  });
  
  if (!validationResult.success) {
    console.error(`[speaker-identification] Ошибка валидации входных данных: ${validationResult.error.message}`);
    // Продолжаем с обрезанным текстом, но логируем ошибку
  }

  // Извлекаем данные из giga-am результата - сначала ищем diarized, затем fallback на обычный
  const gigaAmLog = result.metadata.asrLogs?.find((log) => log.provider === "gigaam-diarized") 
    ?? result.metadata.asrLogs?.find((log) => log.provider === "gigaam");
  const gigaAmRaw = gigaAmLog?.raw;

  // Безопасно извлекаем speaker_timeline
  const speakerTimeline = extractSpeakerTimeline(gigaAmRaw);

  // Извлекаем utterances с эмбеддингами и confidence
  const utterances = gigaAmLog?.utterances;
  const segments = extractSegmentsFromUtterances(utterances || []);

  return identifySpeakersWithEmbeddings(normalizedText, {
    direction: call.direction,
    managerName: managerNameFromPbx ?? fallbackManagerName,
    workspaceId: call.workspaceId,
    speakerTimeline,
    segments: segments || [],
  });
}
