/**
 * LLM-нормализация распознанного текста:
 * - исправление орфографии и пунктуации
 * - преобразование числительных в словесную форму
 * - стандартизация терминологии
 * - структурирование в читаемый формат
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { createLogger } from "~/logger";

const logger = createLogger("asr-normalize");

const SYSTEM_PROMPT = `Отредактируй транскрипт телефонного разговора:

ИСПРАВЬ:
• Орфографию и пунктуацию
• Типичные ошибки ASR: "вадим" → "Вадим", "мэйл" → "email", "окей" → "ок"
• Числа в словесную форму: "123" → "сто двадцать три", "5%" → "пять процентов"

ФОРМАТИРОВАНИЕ:
• Каждая реплика с новой строки: "Спикер 1: текст"
• Длинные реплики разбивай на предложения с правильной пунктуацией
• Убери повторы слов ("э-э-э", "ну-у-у") и слова-паразиты, если они не несут смысла

СОХРАНИ:
• Разговорный стиль и интонацию
• Все факты, имена, цифры, даты
• Структуру диалога (кто и что сказал)

НЕ ДЕЛАЙ:
• Не пересказывай своими словами
• Не добавляй информацию, которой нет в оригинале
• Не удаляй важные детали

Верни только отредактированный текст без комментариев.`;

export async function normalizeWithLlm(rawText: string): Promise<string> {
  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, возвращаем исходный текст");
    return rawText;
  }

  if (!rawText?.trim()) {
    return rawText;
  }

  const start = Date.now();
  try {
    const { text } = await generateWithAi({
      modelProfile: "cheap",
      system: SYSTEM_PROMPT,
      prompt: `Нормализуй следующий транскрипт:\n\n${rawText}`,
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(60_000),
      functionId: "asr-normalize",
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
