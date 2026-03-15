/**
 * LLM-объединение результатов двух ASR провайдеров:
 * дополняет один транскрипт другим, исправляет ошибки распознавания,
 * объединяет уникальную информацию из обоих источников.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { env } from "@calls/config";
import { createLogger } from "../logger";

const logger = createLogger("asr-merge");

const SYSTEM_PROMPT = `Ты объединяешь два транскрипта одного и того же телефонного разговора, полученные разными системами распознавания речи (ASR).

ЗАДАЧА:
• Создай один итоговый транскрипт, объединив лучшие части обоих
• Если в одном варианте слово распознано лучше (например, "Вадим" вместо "вадим") — используй его
• Если один ASR пропустил реплику или фразу — добавь её из второго
• Если оба ошиблись по-разному — выбери более правдоподобный вариант
• Сохрани структуру диалога: каждая реплика с новой строки в формате "Спикер N: текст"
• Используй единые метки спикеров (Спикер 1, Спикер 2 и т.д.)

ПРАВИЛА:
• Не добавляй информацию, которой нет ни в одном источнике
• Не пересказывай своими словами
• Сохраняй разговорный стиль
• При конфликте (разные интерпретации) — выбирай более естественный вариант
• Порядок реплик должен соответствовать хронологии разговора

Верни только объединённый транскрипт без комментариев.`;

/**
 * Объединяет два транскрипта от разных ASR с помощью LLM.
 * Если доступен только один — возвращает его без изменений.
 */
export async function mergeAsrWithLlm(input: {
  assemblyaiText?: string;
  yandexText?: string;
}): Promise<string> {
  const { assemblyaiText = "", yandexText = "" } = input;
  const a = assemblyaiText.trim();
  const y = yandexText.trim();

  if (!a && !y) return "";
  if (!a) return y;
  if (!y) return a;

  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, возвращаем более длинный вариант");
    return a.length >= y.length ? a : y;
  }

  const start = Date.now();
  try {
    const { text } = await generateWithAi({
      model: env.AI_MODEL ?? "gpt-4o-mini",
      system: SYSTEM_PROMPT,
      prompt: `Объедини два транскрипта одного разговора в один.

--- Транскрипт 1 (AssemblyAI) ---
${a}

--- Транскрипт 2 (Yandex) ---
${y}

--- Итоговый объединённый транскрипт ---`,
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(90_000),
      functionId: "asr-merge",
    });

    logger.info("LLM объединение ASR завершено", {
      processingTimeMs: Date.now() - start,
      assemblyaiLength: a.length,
      yandexLength: y.length,
      mergedLength: text.length,
    });

    return text.trim();
  } catch (error) {
    logger.error("Ошибка LLM объединения ASR", {
      error: error instanceof Error ? error.message : String(error),
    });
    return a.length >= y.length ? a : y;
  }
}
