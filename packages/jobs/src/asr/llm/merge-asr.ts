/**
 * LLM-объединение нескольких кандидатов Giga AM (если их больше одного);
 * при одном источнике возвращает текст без вызова модели.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { createLogger } from "~/logger";

const logger = createLogger("asr-merge");

const SYSTEM_PROMPT = `Ты эксперт по объединению транскриптов телефонных разговоров от ASR.

ГЛАВНОЕ ПРАВИЛО: ИСПОЛЬЗУЙ ТОЛЬКО СЛОВА ИЗ ИСХОДНЫХ ТРАНСКРИПТОВ!
• ЗАПРЕЩЕНО добавлять слова, которых нет ни в одном источнике
• ЗАПРЕЩЕНО пересказывать своими словами
• РАЗРЕШЕНО только выбирать лучший вариант распознавания из исходных источников

ЦЕЛЬ: Создать максимально точный транскрипт.

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ВЫВОДА:
Спикер 1: текст первой реплики
Спикер 2: текст ответной реплики
...

Верни только итоговый транскрипт в формате диалога.`;

/**
 * Нормализует текст Giga AM (при нескольких кандидатах — объединение через LLM).
 */
export async function mergeAsrWithLlm(input: {
  gigaAmText?: string;
  gigaAmTexts?: string[];
}): Promise<string> {
  const { gigaAmText = "", gigaAmTexts = [] } = input;
  const hCandidatesPreDedup = [
    ...gigaAmTexts.map((t) => t.trim()).filter(Boolean),
    gigaAmText.trim(),
  ];
  const hCandidates = hCandidatesPreDedup.filter(
    (value, index, arr) => Boolean(value) && arr.indexOf(value) === index,
  );
  const removedDuplicates = hCandidatesPreDedup.length - hCandidates.length;
  if (removedDuplicates > 0) {
    logger.info("Удалены дубликаты транскриптов Giga AM", {
      beforeCount: hCandidatesPreDedup.length,
      afterCount: hCandidates.length,
      removedDuplicates,
    });
  }
  const texts = hCandidates;

  if (texts.length === 0) return "";
  if (texts.length === 1) return texts[0] ?? "";

  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, возвращаем более длинный вариант");
    return texts.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
    );
  }

  const singleProvider = hCandidates.length === 1;
  const transcriptBlocks = hCandidates
    .map((text, index) => {
      const providerSuffix = singleProvider ? "" : " (Giga AM)";
      return `--- Транскрипт ${index + 1}${providerSuffix} ---\n${text}`;
    })
    .join("\n\n");

  const start = Date.now();
  try {
    const { text } = await generateWithAi({
      modelProfile: "longContext",
      system: SYSTEM_PROMPT,
      prompt: `Объедини транскрипты одного разговора в один.

${transcriptBlocks}

--- Итоговый объединённый транскрипт ---`,
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(90_000),
      functionId: "asr-merge",
    });

    logger.info("LLM объединение ASR завершено", {
      processingTimeMs: Date.now() - start,
      gigaAmLength: hCandidates.reduce((sum, item) => sum + item.length, 0),
      mergedLength: text.length,
    });

    return text.trim();
  } catch (error) {
    logger.error("Ошибка LLM объединения ASR", {
      error: error instanceof Error ? error.message : String(error),
    });
    return texts.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
    );
  }
}
