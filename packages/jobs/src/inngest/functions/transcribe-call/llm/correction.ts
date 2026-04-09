/**
 * LLM коррекция транскрипции
 */

import { generateWithAi } from "@calls/ai";
import { env } from "@calls/config";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "~/logger";

const logger = createLogger("transcribe-llm-correction");

// Схема для структурированного вывода LLM
const CorrectionOutputSchema = z.object({
  segments: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      speaker: z.string(),
      text: z.string(),
    }),
  ),
});

// LLM коррекция включена по умолчанию (можно отключить через env)
const LLM_CORRECTION_ENABLED = env.ENABLE_DUAL_ASR_LLM_CORRECTION;

export interface TranscriptionSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
  confidence?: number;
}

export function buildCorrectionPrompt(
  fullTranscript: string,
  diarizedSegments: TranscriptionSegment[],
): string {
  const segmentsText = diarizedSegments
    .map(
      (seg, i) =>
        `[${i}] ${seg.speaker} (${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s): "${seg.text}"`,
    )
    .join("\n");

  return `Задача: Улучшить качество транскрипции аудио разговора.

У меня есть два варианта транскрипции одного аудио:

1. ПОЛНАЯ ТРАНСКРИПЦИЯ (без разделения по спикерам, больше контекста):
"${fullTranscript}"

2. ТРАНСКРИПЦИЯ С ДИАРИЗАЦИЕЙ (разделена по спикерам, но может быть менее точной на границах):
${segmentsText}

ИНСТРУКЦИИ:
1. Используй контекст из полной транскрипции для улучшения точности сегментов
2. Исправь ошибки распознавания речи (особенно на границах между спикерами)
3. Улучши пунктуацию и форматирование
4. Сохрани временные метки и ID спикеров БЕЗ ИЗМЕНЕНИЙ
5. НЕ объединяй и НЕ разделяй сегменты - только исправляй текст
6. Если текст в сегменте правильный - оставь как есть
7. Обрати особое внимание на короткие сегменты (они чаще содержат ошибки)

ВАЖНО:
- Сохрани ВСЕ сегменты (количество должно совпадать)
- Не меняй порядок сегментов
- Не меняй временные метки (start, end)
- Не меняй ID спикеров (speaker)
- Только улучшай текст (text)`;
}

export async function correctTranscriptionWithLLM(
  prompt: string,
  requestId: string,
): Promise<{ start: number; end: number; speaker: string; text: string }[]> {
  const { output } = await generateWithAi({
    system:
      "Ты эксперт по обработке транскрипций аудио. " +
      "Твоя задача - улучшить качество транскрипции, " +
      "исправляя ошибки распознавания речи и улучшая форматирование.",
    prompt,
    temperature: 0.1,
    output: Output.object({
      schema: CorrectionOutputSchema,
    }),
    functionId: "transcription-llm-correction",
    metadata: {
      requestId,
      tags: ["transcription", "llm-correction", "dual-asr"],
    },
  });

  return output.segments;
}

export function validateAndMergeCorrections(
  originalSegments: TranscriptionSegment[],
  correctedSegments: { start: number; end: number; speaker: string; text: string }[],
): {
  segments: TranscriptionSegment[];
  correctionsApplied: number;
} {
  if (correctedSegments.length !== originalSegments.length) {
    return { segments: originalSegments, correctionsApplied: 0 };
  }

  const validated: TranscriptionSegment[] = [];
  let correctionsApplied = 0;

  for (let i = 0; i < originalSegments.length; i++) {
    const orig = originalSegments[i];
    const corr = correctedSegments[i];

    if (!orig || !corr) {
      logger.warn("Пропуск сегмента при валидации", {
        index: i,
        hasOriginal: !!orig,
        hasCorrected: !!corr,
        originalText: orig?.text?.substring(0, 50),
        correctedText: corr?.text?.substring(0, 50),
      });
      continue;
    }

    const validatedSeg: TranscriptionSegment = {
      start: orig.start,
      end: orig.end,
      speaker: orig.speaker,
      confidence: orig.confidence,
      text: orig.text,
    };

    const correctedText = corr.text?.trim();
    const originalText = orig.text?.trim();

    if (correctedText && correctedText !== originalText) {
      validatedSeg.text = correctedText;
      correctionsApplied++;
    }

    validated.push(validatedSeg);
  }

  return { segments: validated, correctionsApplied };
}

export async function applyLLMCorrection(
  segments: TranscriptionSegment[],
  fullTranscript: string,
  requestId: string,
): Promise<{ segments: TranscriptionSegment[]; correctionsApplied: boolean }> {
  // Проверяем, включена ли LLM коррекция и доступен ли AI провайдер
  const hasAiProvider = !!(env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.DEEPSEEK_API_KEY);

  if (!LLM_CORRECTION_ENABLED || !hasAiProvider) {
    logger.info("LLM correction skipped", {
      requestId,
      enabled: LLM_CORRECTION_ENABLED,
      hasAiProvider,
    });
    return { segments, correctionsApplied: false };
  }

  try {
    logger.info("Starting LLM correction", { requestId });

    const prompt = buildCorrectionPrompt(fullTranscript, segments);

    logger.info("Calling LLM via AI SDK", {
      requestId,
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
    });

    const correctedSegments = await correctTranscriptionWithLLM(prompt, requestId);
    const result = validateAndMergeCorrections(segments, correctedSegments);

    logger.info("LLM correction completed", {
      requestId,
      corrections: result.correctionsApplied,
      provider: env.AI_PROVIDER,
    });

    return {
      segments: result.segments,
      correctionsApplied: result.correctionsApplied > 0,
    };
  } catch (error) {
    // Type guard для проверки error с кодом
    const isErrorWithCode = (err: unknown): err is { code?: string } =>
      err instanceof Error && "code" in err;

    // Проверяем на timeout ошибки
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        (isErrorWithCode(error) && error.code === "ETIMEDOUT") ||
        error.message.includes("timeout"))
    ) {
      logger.error(`Таймаут исправления LLM: ${error.message}`, { requestId });
      return { segments, correctionsApplied: false };
    }

    logger.error("Сбой исправления LLM", { requestId, error });
    return { segments, correctionsApplied: false };
  }
}
