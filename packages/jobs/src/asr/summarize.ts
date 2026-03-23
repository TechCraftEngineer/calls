/**
 * LLM-саммаризация и извлечение метаданных из транскрипта:
 * - Краткое резюме (summary)
 * - Настроение (sentiment)
 * - Заголовок (title)
 * - Тема разговора (topic)
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../logger";

const logger = createLogger("asr-summarize");

export interface SummarizeOptions {
  summaryPrompt?: string;
  companyContext?: string | null;
  model?: string;
}

const DEFAULT_FALLBACK = {
  summary: "",
  sentiment: "Нейтральный",
  title: "Звонок без текста",
  callTopic: "Не определена",
} as const;

export async function summarizeWithLlm(
  text: string,
  options: SummarizeOptions = {},
): Promise<{
  summary?: string;
  sentiment?: string;
  title?: string;
  callTopic?: string;
}> {
  if (!text?.trim() || !hasAiProviderConfigured()) {
    return DEFAULT_FALLBACK;
  }

  const companyBlock = options.companyContext?.trim()
    ? `КОНТЕКСТ КОМПАНИИ:\n${options.companyContext.trim()}\n\nУчитывай это при определении темы (topic), заголовка (title) и sentiment.\n\n`
    : "";

  const defaultPrompt = `Проанализируй телефонный разговор и извлеки ключевую информацию:

1. summary — краткое содержание (2-3 предложения): что обсуждалось, какие решения приняты
2. sentiment — эмоциональный тон: Позитивный (клиент доволен), Нейтральный (деловой тон), Негативный (жалобы, недовольство)
3. title — заголовок звонка (3-7 слов): суть обращения
4. topic — категория темы: Продажи, Поддержка, Жалоба, Консультация, Технический вопрос и т.д.

ВАЖНО ПРИ УПОМИНАНИИ БРЕНДОВ И ТЕРМИНОВ:
• Используй оригинальное написание из транскрипта
• Если бренд написан латиницей (Cisco, Danfoss, Microsoft) — сохраняй латиницу
• Если бренд написан кириллицей (Циско, Данфосс) — сохраняй кириллицу
• НЕ транслитерируй и НЕ переводи названия брендов
• Сохраняй точные названия продуктов и услуг из разговора

Отвечай только на русском языке. Будь конкретным и лаконичным.`;

  const systemPrompt = companyBlock + (options.summaryPrompt || defaultPrompt);

  const schema = z.object({
    summary: z
      .string()
      .describe("Краткое содержание разговора (1-3 предложения)"),
    sentiment: z
      .string()
      .describe(
        "Настроение разговора (например: Позитивный, Нейтральный, Негативный)",
      ),
    title: z.string().describe("Краткий заголовок темы звонка"),
    topic: z.string().describe("Основная тема обсуждения"),
  });

  try {
    const { output: result } = await generateWithAi({
      model: options.model,
      modelProfile: "default",
      system: systemPrompt,
      prompt: `Проанализируй следующий разговор:\n\n${text}`,
      output: Output.object({ schema }),
      functionId: "asr-summarize",
    });

    logger.info("LLM саммаризация завершена", {
      summaryLength: result.summary.length,
      sentiment: result.sentiment,
      topic: result.topic,
    });

    return {
      summary: result.summary,
      sentiment: result.sentiment,
      title: result.title,
      callTopic: result.topic,
    };
  } catch (error) {
    logger.error("Ошибка при генерации саммари", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...DEFAULT_FALLBACK };
  }
}
