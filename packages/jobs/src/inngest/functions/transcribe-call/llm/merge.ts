/**
 * LLM merging двух ASR результатов
 * Объединяет результат ASR без диаризации (более точный текст)
 * с результатом ASR с диаризацией (спикер разметка)
 */

import { generateWithAi } from "@calls/ai";
import { env, LLM_CONFIG } from "@calls/config";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../../../../logger";

const logger = createLogger("transcribe-llm-merge");

// Максимальное количество токенов для LLM промпта
export const MAX_PROMPT_TOKENS = 12000;

// Максимальное количество токенов для одного чанка при чанкировании
const CHUNK_TARGET_TOKENS = 8000;

// Минимальное количество сегментов в чанке
const MIN_SEGMENTS_PER_CHUNK = 3;

// Тип для чанка
interface Chunk {
  segments: AsrSegment[];
  transcriptSlice: string;
  startTime: number;
  endTime: number;
}

// Оценка количества токенов с учетом кириллицы
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;
  if (text.length > 1000000) {
    logger.warn("Text too long for token estimation, capping at 1M characters");
    text = text.slice(0, 1000000);
  }

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
        `[${i}] ${seg.speaker} (${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s): "${seg.text}"`,
    )
    .join("\n");

  return `ЗАДАЧА: Объединить два варианта транскрипции одного аудио.

ВХОДНЫЕ ДАННЫЕ:
1. ТОЧНЫЙ ТЕКСТ (без разделения на спикеров):
"${nonDiarizedTranscript}"

2. СТРУКТУРА РАЗГОВОРА (временные метки и спикеры):
${segmentsText}

ПРАВИЛА (строго):
1. Используй ТОЧНЫЙ ТЕКСТ из пункта 1 — он правильный
2. Сохраняй ВРЕМЕННЫЕ МЕТКИ из пункта 2 без изменений (до сотых долей секунды)
3. Сохраняй ID спикеров (SPEAKER_00, SPEAKER_01 и т.д.)
4. Распредели текст по спикерам согласно временным меткам
5. НЕ добавляй дубликаты — каждая фраза только у одного спикера
6. Улучши пунктуацию и форматирование текста

ОШИБКИ, КОТОРЫЕ НЕЛЬЗЯ ДОПУСКАТЬ:
- Одинаковый текст у разных спикеров
- Изменение временных меток
- Пропуск сегментов

ВЫВОД: JSON с полями:
- segments: массив объектов {start, end, speaker, text, confidence?}
- mergedTranscript: полный текст без дубликатов
- quality: {score: 0-1, improvements: []}`;
}

/**
 * Разбивает сегменты на чанки по временным окнам для обработки больших транскрипций
 */
function splitIntoChunks(
  segments: AsrSegment[],
  nonDiarizedTranscript: string,
  targetTokens: number,
): Chunk[] {
  if (segments.length === 0) return [];

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  if (!firstSegment || !lastSegment) return [];

  const totalDuration = lastSegment.end - firstSegment.start;

  // Оцениваем сколько сегментов поместится в один чанк
  const avgSegmentTextLength =
    segments.reduce((sum, s) => sum + s.text.length, 0) / segments.length;
  const estimatedTokensPerSegment = estimateTokenCount(
    "a".repeat(Math.round(avgSegmentTextLength)),
  );
  const segmentsPerChunk = Math.max(
    MIN_SEGMENTS_PER_CHUNK,
    Math.floor((targetTokens * 0.6) / Math.max(estimatedTokensPerSegment, 50)),
  );

  const chunks: Chunk[] = [];

  for (let i = 0; i < segments.length; i += segmentsPerChunk) {
    const chunkSegments = segments.slice(i, i + segmentsPerChunk);
    const firstChunkSegment = chunkSegments[0];
    const lastChunkSegment = chunkSegments[chunkSegments.length - 1];
    if (!firstChunkSegment || !lastChunkSegment) continue;

    const startTime = firstChunkSegment.start;
    const endTime = lastChunkSegment.end;

    // Извлекаем соответствующую часть текста из nonDiarized транскрипции
    // Используем эвристику: делим transcript пропорционально времени
    const transcriptSlice = extractTranscriptSlice(
      nonDiarizedTranscript,
      startTime,
      endTime,
      totalDuration,
    );

    chunks.push({
      segments: chunkSegments,
      transcriptSlice,
      startTime,
      endTime,
    });
  }

  return chunks;
}

/**
 * Извлекает срез транскрипции по временным меткам
 * Использует пропорциональное деление текста с небольшим оверлапом
 */
function extractTranscriptSlice(
  transcript: string,
  startTime: number,
  endTime: number,
  totalDuration: number,
): string {
  if (totalDuration <= 0 || transcript.length === 0) return transcript;

  // Валидация параметров
  if (startTime < 0 || endTime > totalDuration || startTime > endTime) {
    logger.warn("Invalid time parameters for transcript slice", {
      startTime,
      endTime,
      totalDuration,
    });
    return transcript;
  }

  const ratio = startTime / totalDuration;
  const endRatio = endTime / totalDuration;

  // Добавляем небольшой оверлап для контекста (5% с каждой стороны)
  const overlap = 0.05;
  const startIdx = Math.max(0, Math.floor(transcript.length * (ratio - overlap)));
  const endIdx = Math.min(transcript.length, Math.ceil(transcript.length * (endRatio + overlap)));

  return transcript.slice(startIdx, endIdx);
}

/**
 * Обрабатывает один чанк через LLM
 */
async function processChunk(
  chunk: Chunk,
  chunkIndex: number,
  totalChunks: number,
  requestId: string,
  companyContext?: string,
): Promise<{
  segments: AsrSegment[];
  chunkTranscript: string;
  quality: { score: number; improvements: string[] };
}> {
  const chunkStartTime = Date.now();
  const prompt = buildMergingPrompt(chunk.transcriptSlice, chunk.segments);

  logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks}`, {
    requestId,
    chunkIndex: chunkIndex + 1,
    totalChunks,
    segmentsCount: chunk.segments.length,
    transcriptSliceLength: chunk.transcriptSlice.length,
    timeRange: `${chunk.startTime.toFixed(2)}s - ${chunk.endTime.toFixed(2)}s`,
  });

  const { output } = await generateWithAi({
    modelProfile: "cheap",
    system:
      "Ты эксперт по обработке транскрипций аудио. " +
      "Объедини точный текст с правильным разделением по говорящим. " +
      `Часть ${chunkIndex + 1} из ${totalChunks}. ` +
      "КАЖДАЯ фраза должна быть только у одного спикера — никаких дубликатов." +
      (companyContext ? `\n\n${companyContext}` : ""),
    prompt,
    temperature: 0.1,
    maxRetries: 2,
    timeout: LLM_CONFIG.MERGE_TIMEOUT_MS,
    abortSignal: AbortSignal.timeout(LLM_CONFIG.MERGE_TIMEOUT_MS),
    output: Output.object({
      schema: MergedOutputSchema,
    }),
    functionId: "transcription-llm-merge-chunk",
    metadata: {
      requestId,
      chunkIndex: chunkIndex + 1,
      totalChunks,
      tags: ["transcription", "llm-merge", "chunk"],
      hasCompanyContext: !!companyContext,
    },
  });

  // Преобразуем результат в AsrSegment[], используя канонические значения из оригинальных сегментов
  type MergedSegment = z.infer<typeof MergedOutputSchema>["segments"][number];

  // Проверяем совпадение длин массивов
  if (output.segments.length !== chunk.segments.length) {
    logger.warn(
      `LLM returned different segment count: ${output.segments.length} vs ${chunk.segments.length}`,
      {
        requestId,
        chunkIndex: chunkIndex + 1,
        totalChunks,
      },
    );
  }

  const segments: AsrSegment[] = output.segments.map((seg: MergedSegment, index: number) => {
    // Используем оригинальные timestamp и speaker из chunk.segments по индексу
    // Если индекс выходит за пределы, используем значения из LLM
    const originalSeg = chunk.segments[index];
    return {
      start: originalSeg?.start ?? seg.start,
      end: originalSeg?.end ?? seg.end,
      speaker: originalSeg?.speaker ?? seg.speaker,
      text: seg.text, // Текст берем из LLM (исправленный)
      confidence: seg.confidence ?? originalSeg?.confidence,
    };
  });

  const chunkDurationMs = Date.now() - chunkStartTime;
  logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} completed`, {
    requestId,
    chunkIndex: chunkIndex + 1,
    totalChunks,
    durationMs: chunkDurationMs,
    qualityScore: output.quality.score,
    segmentsCount: segments.length,
  });

  return {
    segments,
    chunkTranscript: output.mergedTranscript,
    quality: output.quality,
  };
}

/**
 * Объединяет результаты чанков в единый результат
 */
interface ChunkResult {
  segments: AsrSegment[];
  chunkTranscript: string;
  quality: { score: number; improvements: string[] };
}

function combineChunkResults(
  chunkResults: ChunkResult[],
  originalSegments: AsrSegment[],
  totalChunks: number,
): {
  segments: AsrSegment[];
  mergedTranscript: string;
  quality: { score: number; improvements: string[] };
} {
  if (chunkResults.length === 0) {
    return {
      segments: originalSegments,
      mergedTranscript: originalSegments.map((s) => s.text).join(" "),
      quality: { score: 0.5, improvements: ["Не удалось обработать ни один чанк"] },
    };
  }

  // Объединяем все сегменты
  const allSegments: AsrSegment[] = [];
  for (const result of chunkResults) {
    allSegments.push(...result.segments);
  }

  // Сортируем по времени
  allSegments.sort((a, b) => a.start - b.start);

  // Объединяем transcript
  const mergedTranscript = chunkResults.map((r) => r.chunkTranscript).join("\n\n");

  // Агрегируем quality score (среднее взвешенное)
  const totalScore = chunkResults.reduce((sum, r) => sum + r.quality.score, 0);
  const avgScore = totalScore / chunkResults.length;

  // Собираем все улучшения
  const allImprovements: string[] = [
    `Обработано чанков: ${chunkResults.length}/${totalChunks}`,
    ...chunkResults.flatMap((r) => r.quality.improvements),
  ];

  return {
    segments: allSegments,
    mergedTranscript,
    quality: {
      score: avgScore,
      improvements: allImprovements,
    },
  };
}

/**
 * Обрабатывает большую транскрипцию через чанкирование
 */
async function mergeWithChunking(
  nonDiarized: AsrNonDiarizedResult,
  diarized: AsrDiarizedResult,
  requestId: string,
  estimatedTokens: number,
  companyContext?: string,
): Promise<{
  segments: AsrSegment[];
  mergedTranscript: string;
  quality: { score: number; improvements: string[] };
  fallbackReason?: string;
}> {
  logger.info(
    `Starting chunked LLM merge (estimatedTokens: ${estimatedTokens}, segments: ${diarized.segments.length})`,
    { requestId },
  );

  // Разбиваем на чанки
  const chunks = splitIntoChunks(diarized.segments, nonDiarized.transcript, CHUNK_TARGET_TOKENS);

  if (chunks.length === 0) {
    logger.warn("No chunks created for processing, using fallback", {
      requestId,
      segmentsCount: diarized.segments.length,
    });
    return {
      segments: diarized.segments,
      mergedTranscript: diarized.transcript,
      quality: {
        score: 0.3,
        improvements: ["Не удалось создать чанки для обработки"],
      },
      fallbackReason: "no_chunks_created",
    };
  }

  logger.info(`Split into ${chunks.length} chunks for processing`, {
    requestId,
    chunkCount: chunks.length,
  });

  // Обрабатываем чанки последовательно (для предсказуемости и контроля rate limits)
  const chunkResults: ChunkResult[] = [];

  let failedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    try {
      const result = await processChunk(chunk, i, chunks.length, requestId, companyContext);
      chunkResults.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Chunk ${i + 1}/${chunks.length} failed`, {
        requestId,
        error: errorMessage,
        chunkIndex: i,
      });
      failedChunks++;

      // Для failed чанка используем оригинальные сегменты
      const failedChunk = chunks[i];
      if (failedChunk) {
        chunkResults.push({
          segments: failedChunk.segments.map((s) => ({
            speaker: s.speaker,
            start: s.start,
            end: s.end,
            text: s.text,
            confidence: s.confidence, // Сохраняем confidence
          })),
          chunkTranscript: failedChunk.segments.map((s) => s.text).join(" "),
          quality: {
            score: 0.5,
            improvements: [`Чанк ${i + 1} обработан с ошибкой: ${errorMessage}`],
          },
        });
      }
    }
  }

  // Объединяем результаты
  const combined = combineChunkResults(chunkResults, diarized.segments, chunks.length);

  logger.info(`Chunked LLM merge completed`, {
    requestId,
    processedChunks: chunkResults.length,
    failedChunks,
    avgQualityScore: combined.quality.score,
    totalSegments: combined.segments.length,
  });

  return {
    ...combined,
    fallbackReason:
      failedChunks > 0 ? `partial_chunk_failures:${failedChunks}/${chunks.length}` : undefined,
  };
}

export async function mergeAsrResultsWithLLM(
  nonDiarized: AsrNonDiarizedResult,
  diarized: AsrDiarizedResult,
  requestId: string,
  companyContext?: string,
): Promise<{
  segments: AsrSegment[];
  mergedTranscript: string;
  quality: { score: number; improvements: string[] };
  fallbackReason?: string;
}> {
  const mergeStartTime = Date.now();
  const prompt = buildMergingPrompt(nonDiarized.transcript, diarized.segments);
  const estimatedTokens = estimateTokenCount(prompt);

  logger.info("Starting ASR merge", {
    requestId,
    estimatedTokens,
    maxPromptTokens: MAX_PROMPT_TOKENS,
    diarizedSegmentsCount: diarized.segments.length,
    nonDiarizedTranscriptLength: nonDiarized.transcript.length,
  });

  // Проверяем лимит токенов
  if (estimatedTokens > MAX_PROMPT_TOKENS) {
    logger.warn(
      `Prompt too large for single LLM call, using chunking (estimatedTokens: ${estimatedTokens}, requestId: ${requestId})`,
    );

    // Используем чанкирование вместо полного fallback
    return mergeWithChunking(nonDiarized, diarized, requestId, estimatedTokens, companyContext);
  }

  const { output } = await generateWithAi({
    modelProfile: "cheap",
    system:
      "Ты эксперт по обработке транскрипций аудио. " +
      "Объедини точный текст с правильным разделением по говорящим. " +
      "КАЖДАЯ фраза должна быть только у одного спикера — никаких дубликатов." +
      (companyContext ? `\n\n${companyContext}` : ""),
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
      hasCompanyContext: !!companyContext,
    },
  });

  // Преобразуем результат в AsrSegment[], используя канонические значения из оригинальных сегментов
  type MergedSegment = z.infer<typeof MergedOutputSchema>["segments"][number];

  // Проверяем совпадение длин массивов
  if (output.segments.length !== diarized.segments.length) {
    logger.warn(
      `LLM returned different segment count: ${output.segments.length} vs ${diarized.segments.length}`,
      {
        requestId,
      },
    );
  }

  const segments: AsrSegment[] = output.segments.map((seg: MergedSegment, index: number) => {
    // Используем оригинальные timestamp и speaker из diarized.segments по индексу
    // Если индекс выходит за пределы, используем значения из LLM
    const originalSeg = diarized.segments[index];
    return {
      start: originalSeg?.start ?? seg.start,
      end: originalSeg?.end ?? seg.end,
      speaker: originalSeg?.speaker ?? seg.speaker,
      text: seg.text, // Текст берем из LLM (исправленный)
      confidence: seg.confidence ?? originalSeg?.confidence,
    };
  });

  const mergeDurationMs = Date.now() - mergeStartTime;
  logger.info("ASR merge completed", {
    requestId,
    durationMs: mergeDurationMs,
    segmentsCount: segments.length,
    qualityScore: output.quality.score,
    mergedTranscriptLength: output.mergedTranscript.length,
  });

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
  companyContext?: string,
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

    const result = await mergeAsrResultsWithLLM(
      nonDiarizedResult,
      diarizedResult,
      requestId,
      companyContext,
    );

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
