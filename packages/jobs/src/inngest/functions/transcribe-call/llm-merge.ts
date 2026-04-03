/**
 * LLM merging двух ASR результатов
 * Объединяет результат ASR без диаризации (более точный текст)
 * с результатом ASR с диаризацией (спикер разметка)
 */

import { generateWithAi } from "@calls/ai";
import { env } from "@calls/config";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../../../logger";

const logger = createLogger("transcribe-llm-merge");

export interface AsrSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
  embedding?: number[];
  confidence?: number;
}

export interface AsrDiarizedResult {
  segments: AsrSegment[];
  transcript: string;
}

export interface AsrNonDiarizedResult {
  transcript: string;
}

// Схема для структурированного вывода LLM
const MergedOutputSchema = z.object({
  segments: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      speaker: z.string(),
      text: z.string(),
      confidence: z.number().optional(),
    }),
  ),
  mergedTranscript: z.string(),
  quality: z.object({
    score: z.number().min(0).max(1),
    improvements: z.array(z.string()),
  }),
});

export function buildMergingPrompt(
  nonDiarizedTranscript: string,
  diarizedSegments: AsrSegment[],
  diarizedTranscript: string,
): string {
  const segmentsText = diarizedSegments
    .map(
      (seg, i) =>
        `[${i}] ${seg.speaker} (${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s): "${seg.text}"`,
    )
    .join("\n");

  return `Задача: Создать идеальную транскрипцию аудио разговора путем объединения двух ASR результатов.

У меня есть два результата распознавания одного и того же аудио:

1. ASR БЕЗ ДИАРИЗАЦИИ (более точное распознавание речи, больше контекста):
"${nonDiarizedTranscript}"

2. ASR С ДИАРИЗАЦИЕЙ (есть разделение по спикерам, но текст менее точный):
${segmentsText}

ИНСТРУКЦИИ:
1. Используй текст из ASR БЕЗ ДИАРИЗАЦИИ как основу - он более точный
2. Примени разделение по спикерам из ASR С ДИАРИЗАЦИЕЙ
3. Разбей текст из (1) на сегменты согласно временным меткам из (2)
4. Исправь ошибки на границах между спикерами используя контекст из (1)
5. Улучши пунктуацию и форматирование
6. Сохрани временные метки (start, end) из диаризированной версии
7. Если спикеры не распознаны четко - используй SPEAKER_00 и SPEAKER_01

ВАЖНО:
- Сохрани все временные метки максимально точно
- Количество сегментов должно соответствовать диаризированной версии
- Используй текст из non-diarized версии где возможно
- Оцени качество результата от 0 до 1`;
}

export async function mergeAsrResultsWithLLM(
  nonDiarized: AsrNonDiarizedResult,
  diarized: AsrDiarizedResult,
  requestId: string,
): Promise<{
  segments: AsrSegment[];
  mergedTranscript: string;
  quality: { score: number; improvements: string[] };
}> {
  const prompt = buildMergingPrompt(nonDiarized.transcript, diarized.segments, diarized.transcript);

  const { output } = await generateWithAi({
    system:
      "Ты эксперт по обработке транскрипций аудио. " +
      "Твоя задача - объединить результаты двух ASR систем: одна дала точный текст, другая дала разделение по спикерам. " +
      "Создай идеальный результат с точным текстом и правильным разделением по спикерам.",
    prompt,
    temperature: 0.1,
    maxOutputTokens: 8000,
    output: Output.object({
      schema: MergedOutputSchema,
    }),
    functionId: "transcription-llm-merge",
    metadata: {
      requestId,
      tags: ["transcription", "llm-merge", "dual-asr"],
    },
  });

  // Преобразуем результат в AsrSegment[]
  const segments: AsrSegment[] = output.segments.map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    speaker: seg.speaker,
    text: seg.text,
    confidence: seg.confidence,
  }));

  return {
    segments,
    mergedTranscript: output.mergedTranscript,
    quality: output.quality,
  };
}

export async function applyLLMMerging(
  nonDiarizedResult: AsrNonDiarizedResult,
  diarizedResult: AsrDiarizedResult,
  requestId: string,
): Promise<{
  segments: AsrSegment[];
  mergedTranscript: string;
  applied: boolean;
  quality?: { score: number; improvements: string[] };
  fallbackReason?: string;
}> {
  const hasAiProvider = !!(env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.DEEPSEEK_API_KEY);

  if (!hasAiProvider) {
    logger.info("LLM merging skipped - no AI provider", { requestId });
    return {
      segments: diarizedResult.segments,
      mergedTranscript: diarizedResult.transcript,
      applied: false,
      fallbackReason: "no_ai_provider",
    };
  }

  try {
    logger.info("Starting LLM merging of ASR results", { requestId });

    const result = await mergeAsrResultsWithLLM(nonDiarizedResult, diarizedResult, requestId);

    logger.info("LLM merging completed", {
      requestId,
      segmentsCount: result.segments.length,
      qualityScore: result.quality.score,
      provider: env.AI_PROVIDER,
    });

    return {
      segments: result.segments,
      mergedTranscript: result.mergedTranscript,
      applied: true,
      quality: result.quality,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : "Unknown";

    logger.error("LLM merging failed", {
      requestId,
      error: errorMessage,
      errorType,
      provider: env.AI_PROVIDER,
    });

    // Анализ качества fallback результата
    const fallbackQuality = {
      score: 0.5, // Среднее качество для fallback
      improvements: [`Fallback к диаризированному результату из-за ошибки: ${errorType}`],
    };

    // Проверяем качество fallback результата
    const hasValidSegments = diarizedResult.segments.length > 0;
    const hasValidTranscript = diarizedResult.transcript.length > 0;

    if (!hasValidSegments || !hasValidTranscript) {
      fallbackQuality.score = 0.1; // Низкое качество если данные некорректны
      fallbackQuality.improvements.push("Fallback результат имеет низкое качество");
    }

    return {
      segments: diarizedResult.segments,
      mergedTranscript: diarizedResult.transcript,
      applied: false,
      quality: fallbackQuality,
      fallbackReason: `llm_error_${errorType.toLowerCase()}`,
    };
  }
}
