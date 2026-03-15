/**
 * LLM-объединение результатов двух ASR провайдеров:
 * дополняет один транскрипт другим, исправляет ошибки распознавания,
 * объединяет уникальную информацию из обоих источников.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { env } from "@calls/config";
import { createLogger } from "../logger";

const logger = createLogger("asr-merge");

const SYSTEM_PROMPT = `Ты эксперт по объединению транскриптов телефонных разговоров от разных ASR-систем.

ЦЕЛЬ: Создать максимально точный и полный транскрипт, используя сильные стороны каждого источника.

АЛГОРИТМ ОБЪЕДИНЕНИЯ:

1. ВЫРАВНИВАНИЕ СТРУКТУРЫ
   • Сопоставь реплики по смыслу и хронологии
   • Определи единую нумерацию спикеров (Спикер 1, Спикер 2...)
   • Сохрани естественный порядок диалога

2. ВЫБОР ЛУЧШЕГО ВАРИАНТА (для каждой фразы):
   • Имена собственные: выбирай вариант с заглавной буквы ("Вадим" > "вадим")
   • Числа и даты: выбирай более конкретный вариант ("15 мая" > "пятнадцатое")
   • Термины: выбирай правильное написание ("договор" > "даговор")
   • Полнота: если один ASR пропустил слова — восстанови из другого
   • Связность: выбирай грамматически правильный вариант

3. РАЗРЕШЕНИЕ КОНФЛИКТОВ:
   • Если оба варианта звучат правдоподобно — выбирай более естественный для контекста
   • Если один вариант явно ошибочен (бессмыслица) — используй другой
   • Если оба неточны — выбирай тот, что ближе к разговорной речи

4. СОХРАНЕНИЕ АУТЕНТИЧНОСТИ:
   • Не исправляй грамматику разговорной речи
   • Сохраняй междометия, паузы-заполнители ("ну", "вот", "э-э")
   • Не добавляй информацию от себя
   • Не пересказывай — только объединяй существующее

ФОРМАТ ВЫВОДА:
Спикер 1: текст реплики
Спикер 2: текст реплики
...

Верни только итоговый транскрипт без пояснений.`;

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
