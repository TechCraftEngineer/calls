/**
 * Контекстная коррекция ошибок ASR с помощью LLM.
 * Исправляет слова, которые были неправильно распознаны из-за плохого качества звука,
 * используя контекст разговора для определения правильного варианта.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { createLogger } from "@calls/logger";
import { z } from "zod";

const logger = createLogger("asr-context-correction");

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length);

    // Ищем ближайший пробел или точку для корректного разбиения
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      const lastPeriod = text.lastIndexOf(". ", end);
      const lastNewline = text.lastIndexOf("\n", end);

      const bestBreak = Math.max(lastSpace, lastPeriod + 1, lastNewline);

      if (bestBreak > start) {
        end = bestBreak;
        // Include the delimiter in the chunk to preserve spacing
        if (end < text.length) {
          let delta = 0;
          if (text[end] === " ") {
            delta = 1;
          } else if (text.slice(end, end + 2) === ". ") {
            delta = 2;
          } else if (text[end] === "\n") {
            delta = 1;
          }

          // Only add delimiter if it doesn't exceed maxLength
          if (end - start + delta <= maxLength) {
            end += delta;
          }
        }
      }
    }

    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

async function processChunk(chunk: string, companyContext?: string): Promise<string> {
  const contextInfo = companyContext
    ? `\n\nКОНТЕКСТ КОМПАНИИ:\n${companyContext}\n\nКРИТИЧЕСКИ ВАЖНО: Используй ТОЧНО это название компании. НЕ изменяй написание, НЕ транслитерируй, НЕ переводи. Используй эту информацию для лучшего понимания предметной области и терминологии.`
    : "";

  const { text: correctedTextRaw } = await generateWithAi({
    modelProfile: "premium",
    system: SYSTEM_PROMPT,
    prompt: `Проанализируй транскрипт и исправь ошибки ASR, используя контекст разговора:${contextInfo}

--- ТРАНСКРИПТ ---
${chunk}

--- ИСПРАВЛЕННЫЙ ТРАНСКРИПТ ---`,
    temperature: 0.1,
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(600_000),
    functionId: "asr-context-correction-chunk",
  });

  const parsedResponse = CORRECTED_TEXT_SCHEMA.safeParse({
    text: correctedTextRaw,
  });

  if (!parsedResponse.success) {
    logger.warn("Ответ AI для чанка отклонён (пусто), возвращаем оригинал", {
      functionId: "asr-context-correction-chunk",
      issues: parsedResponse.error.issues.map(issue => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.map(p => String(p)),
      })),
    });
    return chunk;
  }

  return parsedResponse.data.text;
}

const CORRECTED_TEXT_SCHEMA = z.object({
  text: z.string().refine((s) => /\S/.test(s), {
    message: "Текст должен содержать хотя бы один непробельный символ",
  }),
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

    // Валидируем обязательное поле message отдельно
    const messageValidation = z.string().trim().min(1).safeParse(normalizedText);
    if (!messageValidation.success) {
      logger.warn("Текст не прошел валидацию, оставляем исходный текст", {
        functionId: "asr-context-correction",
        issues: messageValidation.error.issues.map(issue => ({
          code: issue.code,
          message: issue.message,
          path: issue.path.map(p => String(p)),
        })),
      });
      return text;
    }

    // Нормализуем опциональный контекст
    let normalizedContext: string | undefined;
    if (companyContext) {
      const contextValidation = z
        .string()
        .trim()
        .max(1000, "Контекст не должен превышать 1000 символов")
        .safeParse(companyContext);
      if (contextValidation.success) {
        normalizedContext = contextValidation.data;
      } else {
        // Если контент слишком длинный, выводим предупреждение с полезной информацией
        const isTooLong = contextValidation.error.issues.some(
          (issue) => issue.code === "too_big" && issue.path.length === 0,
        );
        if (isTooLong) {
          logger.warn("Контекст компании слишком длинный, будет проигнорирован", {
            functionId: "asr-context-correction",
            actualLength: companyContext.length,
            maxLength: 1000,
          });
        }
        // Отбрасываем контент, не прерывая коррекцию
      }
    }

    // Если текст слишком длинный, разбиваем на чанки и обрабатываем по частям
    if (normalizedText.length > 2000) {
      logger.info("Текст превышает 2000 символов, обрабатываем по частям", {
        functionId: "asr-context-correction",
        textLength: normalizedText.length,
      });

      const chunks = splitTextIntoChunks(normalizedText, 2000);
      const correctedChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        logger.info(`Обработка чанка ${i + 1}/${chunks.length}`, {
          functionId: "asr-context-correction",
          chunkLength: chunk.length,
        });

        try {
          const correctedChunk = await processChunk(chunk, normalizedContext);
          correctedChunks.push(correctedChunk);
        } catch (error) {
          logger.warn(`Ошибка при обработке чанка ${i + 1}, используем оригинал`, {
            functionId: "asr-context-correction",
            chunkIndex: i,
            error: error instanceof Error ? error.message : String(error),
          });
          correctedChunks.push(chunk);
        }
      }

      const finalText = correctedChunks.join("");
      logger.info("Chunked обработка завершена", {
        functionId: "asr-context-correction",
        processingTimeMs: Date.now() - start,
        inputLength: normalizedText.length,
        outputLength: finalText.length,
        chunksProcessed: chunks.length,
        hasChanges: finalText !== normalizedText,
        hasCompanyContext: !!normalizedContext,
      });

      return finalText;
    }

    const contextInfo = normalizedContext
      ? `\n\nКОНТЕКСТ КОМПАНИИ:\n${normalizedContext}\n\nКРИТИЧЕСКИ ВАЖНО: Используй ТОЧНО это название компании. НЕ изменяй написание, НЕ транслитерируй, НЕ переводи. Используй эту информацию для лучшего понимания предметной области и терминологии.`
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
      abortSignal: AbortSignal.timeout(600_000),
      functionId: "asr-context-correction",
    });

    // Если generateWithAi начнет возвращать метаданные вместе с текстом,
    // нужно синхронно обновить эту схему и shape ответа в @calls/ai.
    const parsedResponse = CORRECTED_TEXT_SCHEMA.safeParse({
      text: correctedTextRaw,
    });

    if (!parsedResponse.success) {
      logger.warn("Ответ AI для контекстной коррекции отклонён (пусто), оставляем исходный текст", {
        functionId: "asr-context-correction",
        issues: parsedResponse.error.issues.map(issue => ({
          code: issue.code,
          message: issue.message,
          path: issue.path.map(p => String(p)),
        })),
      });
      return text;
    }

    const correctedText = parsedResponse.data.text;
    const hasChanges = correctedText.trim() !== normalizedText.trim();

    logger.info("Контекстная коррекция завершена", {
      processingTimeMs: Date.now() - start,
      inputLength: normalizedText.length,
      outputLength: correctedText.length,
      hasChanges,
      hasCompanyContext: !!normalizedContext,
    });

    return correctedText.trim();
  } catch (error) {
    logger.error("Ошибка контекстной коррекции", {
      error: error instanceof Error ? error.message : String(error),
    });
    return text;
  }
}
