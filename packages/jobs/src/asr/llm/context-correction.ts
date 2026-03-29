/**
 * Контекстная коррекция ошибок ASR с помощью LLM.
 * Исправляет слова, которые были неправильно распознаны из-за плохого качества звука,
 * используя контекст разговора для определения правильного варианта.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { z } from "zod/v4";
import { createLogger } from "../../logger";

const logger = createLogger("asr-context-correction");

const AsrCorrectionInputSchema = z.object({
  message: z.string().trim().min(1),
  context: z.string().trim().optional(),
});

const CORRECTED_TEXT_SCHEMA = z.object({
  text: z.string().trim().min(1),
});

const SYSTEM_PROMPT = `Ты эксперт по исправлению ошибок автоматического распознавания речи (ASR).

ЗАДАЧА: Найти и исправить слова, которые были неправильно распознаны из-за плохого качества звука, тихого произношения или акцента.
КРИТИЧЕСКИ ВАЖНО — ИСПОЛЬЗУЙ КОНТЕКСТ:
• Анализируй смысл всего разговора, тему беседы
• Если слово не подходит по контексту — это вероятно ошибка ASR
• Примеры типичных ошибок:
  - "пирог" вместо "срок" (в контексте сроков поставки)
  - "кот" вместо "код" (в контексте программирования)
  - "мышка" вместо "мишка" (в контексте игрушек)
  - "банк" вместо "бак" (в контексте технического оборудования)
  - "лук" вместо "люк" (в контексте строительства)

АЛГОРИТМ ИСПРАВЛЕНИЯ:
1. АНАЛИЗ КОНТЕКСТА
   • Определи тему разговора (продажи, техподдержка, заказ, консультация)
   • Выяви ключевые термины и предметную область
   • Обрати внимание на профессиональную лексику

2. ПОИСК НЕСООТВЕТСТВИЙ
   • Найди слова, которые выбиваются из контекста
   • Слова, которые грамматически правильны, но семантически неуместны
   • Неожиданные бытовые слова в профессиональном контексте
   • Слова, которые звучат похоже на правильные термины

3. КОНТЕКСТНАЯ ЗАМЕНА
   • Подбери слово, которое:
     а) Звучит похоже на ошибочное (похожие фонемы)
     б) Подходит по смыслу в данном контексте
     в) Соответствует теме разговора
   • Примеры замен:
     - В разговоре о поставках: "пирог доставки" → "срок доставки"
     - В разговоре о ПО: "кот активации" → "код активации"
     - В разговоре о документах: "подписать бумагу" → "подписать договор"

4. ПРОВЕРКА СОГЛАСОВАННОСТИ
   • Убедись, что исправление не нарушает грамматику
   • Проверь согласование с соседними словами
   • Сохрани падеж, число, род

ПРАВИЛА БЕЗОПАСНОСТИ:
✅ ИСПРАВЛЯЙ:
• Явные ошибки ASR (слово не подходит по контексту)
• Неуместные бытовые слова в профессиональном контексте
• Слова, которые делают фразу бессмысленной

❌ НЕ ИСПРАВЛЯЙ:
• Слова, которые подходят по контексту (даже если кажутся странными)
• Разговорные выражения и сленг
• Имена собственные (даже необычные)
• Диалектизмы и региональные особенности речи
• Слова-паразиты ("ну", "вот", "типа") — они часть живой речи

❌ НЕ ДОБАВЛЯЙ:
• Новые слова, которых не было в оригинале
• Вежливые обращения
• Профессиональные термины, если их не было

ФОРМАТ ВЫВОДА:
Верни исправленный транскрипт в том же формате, что и входной (с разделением на спикеров).
Если ошибок не найдено — верни текст без изменений.

ВАЖНО: Будь консервативен. Исправляй только явные ошибки. Сомневаешься — не исправляй.`;

export async function correctWithContext(
  text: string,
  options?: {
    companyContext?: string | null;
  },
): Promise<string> {
  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, пропускаем контекстную коррекцию");
    return text;
  }

  if (!text?.trim()) {
    return text;
  }

  const start = Date.now();
  try {
    const normalizedText = text.trim();
    const companyContext = options?.companyContext?.trim() ?? undefined;

    const parsedInput = AsrCorrectionInputSchema.safeParse({
      message: normalizedText,
      context: companyContext,
    });

    if (!parsedInput.success) {
      logger.warn(
        "Входные данные контекстной коррекции не прошли валидацию, оставляем исходный текст",
        {
          functionId: "asr-context-correction",
          issues: parsedInput.error.issues,
        },
      );
      return text;
    }

    const contextInfo = companyContext
      ? `\n\nКОНТЕКСТ КОМПАНИИ:\n${companyContext}\n\nКРИТИЧЕСКИ ВАЖНО: Используй ТОЧНО это название компании. НЕ изменяй написание, НЕ транслитерируй, НЕ переводи. Используй эту информацию для лучшего понимания предметной области и терминологии.`
      : "";

    const { text: correctedTextRaw } = await generateWithAi({
      modelProfile: "premium",
      system: SYSTEM_PROMPT,
      prompt: `Проанализируй транскрипт и исправь ошибки ASR, используя контекст разговора:${contextInfo}

--- ТРАНСКРИПТ ---
${normalizedText}

--- ИСПРАВЛЕННЫЙ ТРАНСКРИПТ ---`,
      temperature: 0.1, // Низкая температура для консервативных исправлений
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(60_000),
      functionId: "asr-context-correction",
    });

    // Если generateWithAi начнет возвращать метаданные вместе с текстом,
    // нужно синхронно обновить эту схему и shape ответа в @calls/ai.
    const parsedResponse = CORRECTED_TEXT_SCHEMA.safeParse({
      text: correctedTextRaw,
    });

    if (!parsedResponse.success) {
      logger.warn(
        "Ответ AI для контекстной коррекции отклонён (пусто), оставляем исходный текст",
        {
          functionId: "asr-context-correction",
          issues: parsedResponse.error.issues,
        },
      );
      return text;
    }

    const correctedText = parsedResponse.data.text;
    const hasChanges = correctedText.trim() !== normalizedText.trim();

    logger.info("Контекстная коррекция завершена", {
      processingTimeMs: Date.now() - start,
      inputLength: normalizedText.length,
      outputLength: correctedText.length,
      hasChanges,
      hasCompanyContext: !!companyContext,
    });

    return correctedText.trim();
  } catch (error) {
    logger.error("Ошибка контекстной коррекции", {
      error: error instanceof Error ? error.message : String(error),
    });
    return text;
  }
}
