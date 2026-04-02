/**
 * Inngest функция: Обработка завершённой транскрипции.
 *
 * Получает результаты от GigaAM и оркестрирует дальнейшую обработку:
 * - LLM коррекция (если включена)
 * - Сохранение результатов
 * - Отправка webhook
 *
 * Вся оркестрация здесь, Python сервисы только выполняют свои задачи.
 */

import { createLogger } from "../../logger";
import { inngest } from "../client";

const logger = createLogger("transcription-completed");

interface Segment {
  start: number;
  end: number;
  speaker: string;
  text: string;
  confidence?: number;
}

interface TranscriptionMetadata {
  diarizationTime: number;
  asrTime: number;
  alignmentTime: number;
  totalDuration: number;
}

// LLM настройки из окружения Inngest (не из Python!)
const LLM_CONFIG = {
  apiUrl: process.env.DUAL_ASR_LLM_API_URL || process.env.LLM_API_URL || "",
  apiKey: process.env.DUAL_ASR_LLM_API_KEY || process.env.LLM_API_KEY || "",
  model: process.env.DUAL_ASR_LLM_MODEL || "gpt-4o-mini",
  timeout: parseInt(process.env.DUAL_ASR_LLM_TIMEOUT || "60", 10),
  enabled: process.env.ENABLE_DUAL_ASR_LLM_CORRECTION !== "false",
};

function buildCorrectionPrompt(fullTranscript: string, diarizedSegments: Segment[]): string {
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
- Только улучшай текст (text)

Верни результат СТРОГО в JSON формате:
{
  "segments": [
    {"start": 2.08, "end": 2.71, "speaker": "SPEAKER_00", "text": "исправленный текст"},
    ...
  ]
}

Верни ТОЛЬКО JSON, без дополнительных комментариев.`;
}

async function callLLMAPI(prompt: string, timeout: number): Promise<Segment[]> {
  if (!LLM_CONFIG.apiUrl || !LLM_CONFIG.apiKey) {
    throw new Error("LLM API not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const response = await fetch(`${LLM_CONFIG.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          {
            role: "system",
            content:
              "Ты эксперт по обработке транскрипций аудио. " +
              "Твоя задача - улучшить качество транскрипции, " +
              "исправляя ошибки распознавания речи и улучшая форматирование. " +
              "Всегда возвращай результат в строгом JSON формате.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    if (!result.segments) {
      throw new Error("LLM response missing 'segments'");
    }

    return result.segments;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function validateAndMergeCorrections(
  originalSegments: Segment[],
  correctedSegments: Segment[],
): { segments: Segment[]; correctionsApplied: number } {
  if (correctedSegments.length !== originalSegments.length) {
    return { segments: originalSegments, correctionsApplied: 0 };
  }

  const validated: Segment[] = [];
  let correctionsApplied = 0;

  for (let i = 0; i < originalSegments.length; i++) {
    const orig = originalSegments[i]!;
    const corr = correctedSegments[i]!;

    const validatedSeg: Segment = {
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
  },
  { event: "asr/transcription.completed" },
  async ({ event, step }) => {
    const { requestId, fullTranscript, diarizedSegments, metadata } = event.data;

    await step.run("validate/input", async () => {
      if (!requestId) throw new Error("requestId required");
      if (!fullTranscript) throw new Error("fullTranscript required");
      if (!diarizedSegments?.length) throw new Error("diarizedSegments required");
    });

    let finalSegments = diarizedSegments;
    let llmCorrectionApplied = false;

    // LLM коррекция (если включена)
    if (LLM_CONFIG.enabled && LLM_CONFIG.apiUrl && LLM_CONFIG.apiKey) {
      const prompt = await step.run("llm/build-prompt", async () => {
        logger.info("Building LLM prompt", { requestId });
        return buildCorrectionPrompt(fullTranscript, diarizedSegments);
      });

      const correctedSegments = await step.run("llm/correct", async () => {
        logger.info("Calling LLM", { requestId, model: LLM_CONFIG.model });
        try {
          return await callLLMAPI(prompt, LLM_CONFIG.timeout);
        } catch (error) {
          logger.error("LLM failed", { requestId, error });
          return diarizedSegments;
        }
      });

      const result = await step.run("llm/validate", async () => {
        return validateAndMergeCorrections(diarizedSegments, correctedSegments);
      });

      finalSegments = result.segments;
      llmCorrectionApplied = result.correctionsApplied > 0;

      logger.info("LLM correction done", {
        requestId,
        corrections: result.correctionsApplied,
      });
    }

    return {
      requestId,
      segments: finalSegments,
      llmCorrectionApplied,
      metadata,
    };
  },
);
