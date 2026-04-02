/**
 * Inngest функция: Обработка завершённой транскрипции.
 *
 * Простая архитектура: Inngest получает результат и обрабатывает его.
 * - LLM коррекция (если включена)
 * - Сохранение результатов
 * - Отправка webhook
 *
 * Вся оркестрация здесь, Python сервисы только выполняют свои задачи.
 */

import { generateWithAi } from "@calls/ai";
import { env } from "@calls/config";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../../logger";
import { inngest } from "../client";

const logger = createLogger("transcription-completed");

// Схема для валидации входных данных (новая архитектура)
const TranscriptionCompletedSchema = z.object({
  requestId: z.string().min(1, "requestId cannot be empty"),
  transcriptionResult: z.object({
    success: z.boolean(),
    segments: z.array(
      z.object({
        start: z.number(),
        end: z.number(),
        speaker: z.string(),
        text: z.string(),
        confidence: z.number().optional(),
      }),
    ),
    speaker_timeline: z.array(
      z.object({
        speaker: z.string(),
        segments: z.array(
          z.object({
            start: z.number(),
            end: z.number(),
          }),
        ),
      }),
    ),
    final_transcript: z.string(),
    total_duration: z.number(),
    pipeline: z.string(),
    stages: z.array(z.string()),
    dual_asr_enabled: z.boolean(),
  }),
});

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
const LLM_CORRECTION_ENABLED = process.env.ENABLE_DUAL_ASR_LLM_CORRECTION !== "false";

function buildCorrectionPrompt(
  fullTranscript: string,
  diarizedSegments: {
    start: number;
    end: number;
    speaker: string;
    text: string;
    confidence?: number;
  }[],
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

async function correctTranscriptionWithLLM(
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
    maxOutputTokens: 4000,
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

function validateAndMergeCorrections(
  originalSegments: {
    start: number;
    end: number;
    speaker: string;
    text: string;
    confidence?: number;
  }[],
  correctedSegments: { start: number; end: number; speaker: string; text: string }[],
): {
  segments: { start: number; end: number; speaker: string; text: string; confidence?: number }[];
  correctionsApplied: number;
} {
  if (correctedSegments.length !== originalSegments.length) {
    return { segments: originalSegments, correctionsApplied: 0 };
  }

  const validated: {
    start: number;
    end: number;
    speaker: string;
    text: string;
    confidence?: number;
  }[] = [];
  let correctionsApplied = 0;

  for (let i = 0; i < originalSegments.length; i++) {
    const orig = originalSegments[i];
    const corr = correctedSegments[i];

    if (!orig || !corr) continue;

    const validatedSeg: {
      start: number;
      end: number;
      speaker: string;
      text: string;
      confidence?: number;
    } = {
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

export const transcriptionCompletedFn = inngest.createFunction(
  {
    id: "transcription-completed",
    name: "Обработка завершённой транскрипции (оркестрация)",
    retries: 2,
    concurrency: {
      limit: 5,
    },
    triggers: [{ event: "asr/transcription.completed" }],
  },
  async ({ event, step }) => {
    await step.run("validate/input", async () => {
      const validationResult = TranscriptionCompletedSchema.safeParse(event.data);

      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Validation failed: ${errorDetails}`);
      }

      // Деструктуризация валидированных данных
      const { requestId, transcriptionResult } = validationResult.data;
      const { segments, final_transcript } = transcriptionResult;

      return { requestId, transcriptionResult, segments, fullTranscript: final_transcript };
    });

    // Получаем валидированные данные из предыдущего шага
    const { requestId, transcriptionResult, segments, fullTranscript } = await step.run(
      "validate/get-data",
      async () => {
        const validationResult = TranscriptionCompletedSchema.safeParse(event.data);
        if (!validationResult.success) {
          throw new Error("Validation should have passed in previous step");
        }
        const { requestId, transcriptionResult } = validationResult.data;
        const { segments, final_transcript } = transcriptionResult;
        return { requestId, transcriptionResult, segments, fullTranscript: final_transcript };
      },
    );

    let finalSegments = segments;
    let llmCorrectionApplied = false;

    // LLM коррекция (если включена и AI провайдер настроен)
    const hasAiProvider = !!(env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.DEEPSEEK_API_KEY);

    if (LLM_CORRECTION_ENABLED && hasAiProvider) {
      const prompt = await step.run("llm/build-prompt", async () => {
        logger.info("Building LLM prompt", { requestId });
        return buildCorrectionPrompt(fullTranscript, segments);
      });

      const correctedSegments = await step.run("llm/correct", async () => {
        logger.info("Calling LLM via AI SDK", {
          requestId,
          provider: env.AI_PROVIDER,
          model: env.AI_MODEL,
        });
        try {
          return await correctTranscriptionWithLLM(prompt, requestId);
        } catch (error) {
          logger.error("LLM correction failed", { requestId, error });
          // Возвращаем оригинальные сегменты при ошибке
          return segments;
        }
      });

      const result = await step.run("llm/validate", async () => {
        return validateAndMergeCorrections(segments, correctedSegments);
      });

      finalSegments = result.segments;
      llmCorrectionApplied = result.correctionsApplied > 0;

      logger.info("LLM correction done", {
        requestId,
        corrections: result.correctionsApplied,
        provider: env.AI_PROVIDER,
      });
    } else {
      logger.info("LLM correction skipped", {
        requestId,
        enabled: LLM_CORRECTION_ENABLED,
        hasAiProvider,
      });
    }

    return {
      requestId,
      segments: finalSegments,
      llmCorrectionApplied,
      transcriptionResult,
    };
  },
);
