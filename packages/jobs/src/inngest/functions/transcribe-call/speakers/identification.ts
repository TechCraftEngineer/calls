/**
 * Идентификация спикеров через LLM
 */

import type { AsrExecutionLog } from "@calls/asr";
import type { IdentifySpeakersWithEmbeddingsResult } from "@calls/asr/llm/identify-speakers-with-embeddings";
import { identifySpeakersWithEmbeddings } from "@calls/asr/llm/identify-speakers-with-embeddings";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import {
  extractSegmentsFromUtterances,
  extractSpeakerTimeline,
} from "../../../../inngest/functions/transcribe-call/utils/extraction";
import { createLogger } from "../../../../logger";

const logger = createLogger("speaker-identification");

// Zod схема для валидации входных данных identifySpeakersWithEmbeddings
// ВАЖНО: Это ограничение только для АНАЛИЗА LLM, полный текст сохраняется в БД
const IdentifySpeakersInputSchema = z.object({
  message: z.string().min(1).max(2000),
  summary: z.string().max(2000).optional(),
  context: z.string().max(500).optional(),
  conversationHistory: z.array(z.string()).max(20).optional(),
});

// Максимальная длина текста для АНАЛИЗА спикеров через LLM
// Полный текст будет сохранен в БД без обрезания
const MAX_MESSAGE_LENGTH = 2000;

// Тип результата идентификации спикеров (для совместимости с main.ts)
export type IdentifySpeakersResult = IdentifySpeakersWithEmbeddingsResult;

export async function identifySpeakers(
  call: {
    direction: string;
    name?: string | null;
    workspaceId: string;
  },
  result: {
    normalizedText: string;
    metadata: {
      asrLogs?: AsrExecutionLog[];
    };
  },
  managerNameFromPbx: string | null,
  summary?: string,
) {
  const fallbackManagerName = call.name?.trim() || null;

  // Сохраняем полный оригинальный текст
  const fullNormalizedText = result.normalizedText;
  const originalLength = fullNormalizedText.length;

  // Ранний возврат для пустого текста - пропускаем идентификацию спикеров
  if (!fullNormalizedText || fullNormalizedText.trim().length === 0) {
    logger.warn("Пустой текст для идентификации спикеров, пропускаем шаг", {
      event: "speaker-identification.empty_input",
      originalLength,
    });
    return {
      text: fullNormalizedText || "",
      operatorName: fallbackManagerName || undefined,
      customerName: undefined,
      metadata: {
        success: false,
        reason: "empty_input",
        mapping: {},
        speakers: [],
        operatorName: fallbackManagerName || null,
        customerName: null,
        usedEmbeddings: false,
        clusterCount: 0,
        fallbackAttempted: false,
      },
    };
  }

  // Обрезаем текст ТОЛЬКО для анализа LLM, но НЕ для сохранения в БД
  let textForAnalysis =
    fullNormalizedText.length > MAX_MESSAGE_LENGTH
      ? fullNormalizedText.substring(0, MAX_MESSAGE_LENGTH)
      : fullNormalizedText;

  // Проверяем, что после обрезки остался реальный текст, а не только пробелы
  if (textForAnalysis.trim().length === 0) {
    // Ищем первый непустой фрагмент в оригинальном тексте
    const firstNonWhitespaceIndex = fullNormalizedText.search(/\S/);
    if (firstNonWhitespaceIndex >= 0) {
      textForAnalysis = fullNormalizedText
        .substring(firstNonWhitespaceIndex, firstNonWhitespaceIndex + MAX_MESSAGE_LENGTH)
        .trim();
    } else {
      // Весь текст состоит из пробелов
      textForAnalysis = fullNormalizedText;
    }
  }

  if (fullNormalizedText.length > MAX_MESSAGE_LENGTH) {
    logger.warn(
      `Текст обрезан для анализа с ${originalLength} до ${MAX_MESSAGE_LENGTH} символов (полный текст будет сохранен в БД)`,
      {
        event: "speaker-identification.truncate_for_analysis",
        originalLength,
        truncatedTo: MAX_MESSAGE_LENGTH,
        previewLength: Math.min(100, textForAnalysis.length),
      },
    );
  }

  // Обрезаем summary если он передан
  const summaryForAnalysis = summary
    ? summary.length > MAX_MESSAGE_LENGTH
      ? summary.substring(0, MAX_MESSAGE_LENGTH)
      : summary
    : undefined;

  // Zod валидация входных данных (проверяем обрезанный текст для анализа)
  const validationResult = IdentifySpeakersInputSchema.safeParse({
    message: textForAnalysis,
    summary: summaryForAnalysis,
    context: fallbackManagerName || undefined,
    conversationHistory: undefined,
  });

  if (!validationResult.success) {
    logger.error("Ошибка валидации входных данных", {
      event: "speaker-identification.validation_error",
      errorCode: validationResult.error?.issues?.[0]?.code,
      errorPath: validationResult.error?.issues?.[0]?.path?.join("."),
      inputLength: textForAnalysis.length,
      hasContext: !!fallbackManagerName,
    });
    // Fail-fast: не продолжаем с невалидными входными данными
    throw new NonRetriableError(
      `Ошибка валидации входных данных для идентификации спикеров: ${validationResult.error.message} (inputLength: ${textForAnalysis.length}, hasContext: ${!!fallbackManagerName})`,
    );
  }

  // Извлекаем данные из giga-am результата - сначала ищем diarized, затем fallback на обычный
  const gigaAmLog =
    result.metadata.asrLogs?.find((log) => (log.provider as string) === "gigaam-diarized") ??
    result.metadata.asrLogs?.find((log) => log.provider === "gigaam");
  const gigaAmRaw = gigaAmLog?.raw;

  // Безопасно извлекаем speaker_timeline
  const speakerTimeline = extractSpeakerTimeline(gigaAmRaw);

  // Извлекаем utterances с эмбеддингами и confidence
  const utterances = gigaAmLog?.utterances;
  const segments = extractSegmentsFromUtterances(utterances || []);

  // Передаем обрезанный текст для анализа, но полный текст для сохранения
  let identificationResult;
  try {
    identificationResult = await identifySpeakersWithEmbeddings(textForAnalysis, {
      direction: call.direction,
      managerName: managerNameFromPbx ?? fallbackManagerName,
      workspaceId: call.workspaceId,
      speakerTimeline,
      segments: segments || [],
      summary: summaryForAnalysis,
    });
  } catch (error) {
    logger.error("Ошибка при идентификации спикеров", {
      event: "speaker-identification.error",
      workspaceId: call.workspaceId,
      direction: call.direction,
      managerName: managerNameFromPbx ?? fallbackManagerName,
      inputLength: textForAnalysis.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // ВАЖНО: Возвращаем ПОЛНЫЙ оригинальный текст, а не обрезанный
  return {
    ...identificationResult,
    text: fullNormalizedText,
  };
}
