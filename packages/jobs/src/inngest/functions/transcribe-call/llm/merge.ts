/**
 * LLM merging двух ASR результатов
 * Объединяет результат ASR без диаризации (более точный текст)
 * с результатом ASR с диаризацией (спикер разметка)
 */

import { generateWithAi } from "@calls/ai";
import { env, LLM_CONFIG } from "@calls/config";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "~/logger";

const logger = createLogger("transcribe-llm-merge");

// Максимальное количество токенов для LLM промпта
export const MAX_PROMPT_TOKENS = 12000;

// Оценка количества токенов с учетом кириллицы
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;

  // Считаем долю не-ASCII символов (кириллица и др.)
  let nonAsciiCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) nonAsciiCount++;
  }

  const nonAsciiRatio = nonAsciiCount / text.length;

  // Используем blended characters-per-token значение
  // 1.8 для кириллицы, 4.0 для ASCII
  const avgCPT = nonAsciiRatio * 1.8 + (1 - nonAsciiRatio) * 4.0;

  return Math.ceil(text.length / avgCPT);
}

export interface AsrSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
  embedding?: number[] | null;
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
): string {
  const segmentsText = diarizedSegments
    .map(
      (seg, i) =>
        `[${i}] Говорящий ${seg.speaker} (${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s): "${seg.text}"`,
    )
    .join("\n");

  return `ЗАДАЧА: Создать идеальную транскрипцию аудио разговора путем объединения двух результатов распознавания речи.

ИСХОДНЫЕ ДАННЫЕ:
1. РЕЗУЛЬТАТ БЕЗ ДИАРИЗАЦИИ (более точное распознавание речи, больше контекста):
"${nonDiarizedTranscript}"

2. РЕЗУЛЬТАТ С ДИАРИЗАЦИЕЙ (есть разделение по говорящим, но текст менее точный):
${segmentsText}

ОПРЕДЕЛЕНИЯ:
- Спикеры - участники разговора (оператор, клиент и т.д.)
- Диаризация - автоматическое разделение речи по говорящим
- Сегменты - фрагменты речи с временными метками и идентификаторами говорящих

ИНСТРУКЦИИ:
1. Используй текст из результата БЕЗ ДИАРИЗАЦИИ как основу - он более точный
2. Примени разделение по говорящим из результата С ДИАРИЗАЦИЕЙ
3. Разбей текст из (1) на сегменты согласно временным меткам из (2)
4. Исправь ошибки на границах между говорящими, используя контекст из (1)
5. Улучши пунктуацию и форматирование русского текста
6. Сохрани временные метки (start, end) из диаризированной версии точно
7. Если говорящие не распознаны четко - используй SPEAKER_00 и SPEAKER_01
8. Создай плавный, грамотный русский текст в mergedTranscript

ВАЖНО:
- Сохрани все временные метки максимально точно
- Количество сегментов должно соответствовать диаризированной версии
- Используй текст из non-diarized версии где возможно для повышения точности
- НЕ выдумывай новых говорящих - используй только те, что есть в диаризации
- mergedTranscript должен быть цельным, связным русским текстом с правильной пунктуацией

ВЫВОД:
Верни JSON объект со следующей структурой:
{
  "segments": [
    {
      "start": 0.00,
      "end": 5.30,
      "speaker": "SPEAKER_00",
      "text": "пример текста",
      "confidence": 0.95
    }
  ],
  "mergedTranscript": "Цельный, грамотный русский текст разговора",
  "quality": {
    "score": 0.85,
    "improvements": ["улучшение 1", "улучшение 2"]
  }
}`;
}

export async function mergeAsrResultsWithLLM(
  nonDiarized: AsrNonDiarizedResult,
  diarized: AsrDiarizedResult,
  requestId: string,
): Promise<{
  segments: AsrSegment[];
  mergedTranscript: string;
  quality: { score: number; improvements: string[] };
  fallbackReason?: string;
}> {
  const prompt = buildMergingPrompt(nonDiarized.transcript, diarized.segments);
  const estimatedTokens = estimateTokenCount(prompt);

  // Проверяем лимит токенов
  if (estimatedTokens > MAX_PROMPT_TOKENS) {
    logger.warn(
      `Prompt too large for LLM merge, using diarized fallback (estimatedTokens: ${estimatedTokens}, requestId: ${requestId})`,
    );
    return {
      segments: diarized.segments,
      mergedTranscript: diarized.transcript,
      quality: {
        score: 0.3, // Низкое качество для fallback
        improvements: [
          `Fallback к диаризированному результату: промпт слишком большой (${estimatedTokens} токенов)`,
        ],
      },
      fallbackReason: `prompt_too_large:${estimatedTokens}_tokens`,
    };
  }

  const { output } = await generateWithAi({
    modelProfile: "cheap",
    system:
      "Ты эксперт по обработке транскрипций аудио на русском языке. " +
      "Твоя задача - объединить результаты двух систем распознавания речи: одна дала точный текст, другая дала разделение по говорящим. " +
      "Создай идеальный результат с точным русским текстом и правильным разделением по говорящим.",
    prompt,
    temperature: 0.1,
    maxRetries: 2,
    timeout: LLM_CONFIG.MERGE_TIMEOUT_MS,
    abortSignal: AbortSignal.timeout(LLM_CONFIG.MERGE_TIMEOUT_MS),
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
  type MergedSegment = z.infer<typeof MergedOutputSchema>["segments"][number];
  const segments: AsrSegment[] = output.segments.map((seg: MergedSegment) => ({
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
      fallbackReason: result.fallbackReason,
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
