/**
 * LLM-нормализация распознанного текста:
 * - исправление орфографии и пунктуации
 * - преобразование числительных в словесную форму
 * - стандартизация терминологии
 * - структурирование в читаемый формат
 */

import { openai } from "@ai-sdk/openai";
import { env } from "@calls/config";
import { generateText } from "ai";
import { createLogger } from "../logger";

const logger = createLogger("asr-normalize");

const SYSTEM_PROMPT = `Ты — редактор транскриптов разговоров. Нормализуй текст по правилам:

1. Исправь орфографические и пунктуационные ошибки
2. Преобразуй числительные в словесную форму (123 → сто двадцать три)
3. Стандартизируй терминологию (если встречаются типичные опечатки ASR — исправь)
4. Структурируй текст: каждый спикер с новой строки, оставь пометки "Спикер N:"
5. Разбей длинные абзацы на предложения с правильной пунктуацией
6. Сохрани смысл и стиль разговорной речи
7. Не добавляй ничего от себя, не пересказывай — только правь и форматируй

Верни ТОЛЬКО нормализованный текст, без пояснений.`;

export async function normalizeWithLlm(rawText: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn("OPENAI_API_KEY не задан, возвращаем исходный текст");
    return rawText;
  }

  if (!rawText?.trim()) {
    return rawText;
  }

  const start = Date.now();
  try {
    const { text } = await generateText({
      model: openai(env.AI_MODEL ?? "gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt: `Нормализуй следующий транскрипт:\n\n${rawText}`,
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(60_000),
    });

    logger.info("LLM нормализация завершена", {
      processingTimeMs: Date.now() - start,
      inputLength: rawText.length,
      outputLength: text.length,
    });

    return text.trim();
  } catch (error) {
    logger.error("Ошибка LLM нормализации", {
      error: error instanceof Error ? error.message : String(error),
    });
    return rawText;
  }
}
