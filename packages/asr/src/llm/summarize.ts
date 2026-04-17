/**
 * LLM-саммаризация и извлечение метаданных из транскрипта:
 * - Краткое резюме (summary)
 * - Настроение (sentiment)
 * - Заголовок (title)
 * - Тема разговора (topic)
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { LLM_CONFIG } from "@calls/config";
import { createLogger } from "@calls/logger";
import { Output } from "ai";
import { z } from "zod";

const logger = createLogger("asr-summarize");

export interface SummarizeOptions {
  summaryPrompt?: string;
  companyContext?: string | null;
  managerName?: string | null;
  model?: string;
  maxChars?: number;
  hardMaxChars?: number;
}

const DEFAULT_FALLBACK = {
  summary: "",
  sentiment: "Нейтральный",
  title: "Звонок без текста",
  callType: "Другое",
  callTopic: "Не определена",
} as const;

const DEFAULT_MAX_CHARS = 40_000;
const DEFAULT_HARD_MAX_CHARS = 200_000;
const REQUEST_FIELD_MAX_CHARS = 2_000;
const TEXT_INPUT_MAX_CHARS = DEFAULT_HARD_MAX_CHARS;

const summarizeInputSchema = z
  .object({
    text: z.string().trim().min(1).max(TEXT_INPUT_MAX_CHARS),
    options: z
      .object({
        summaryPrompt: z.string().trim().max(REQUEST_FIELD_MAX_CHARS).optional(),
        companyContext: z.string().trim().max(REQUEST_FIELD_MAX_CHARS).nullable().optional(),
        managerName: z.string().trim().max(100).nullable().optional(),
        model: z.string().optional(),
        maxChars: z.number().int().positive().max(DEFAULT_HARD_MAX_CHARS).optional(),
        hardMaxChars: z.number().int().positive().max(DEFAULT_HARD_MAX_CHARS).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const options = data.options ?? {};
    const hardMaxChars = options.hardMaxChars ?? DEFAULT_HARD_MAX_CHARS;
    const maxChars = Math.min(options.maxChars ?? DEFAULT_MAX_CHARS, hardMaxChars);
    const summaryLength = options.summaryPrompt?.length ?? 0;
    const companyContextLength = options.companyContext?.length ?? 0;
    const managerNameLength = options.managerName?.length ?? 0;
    const totalRequestChars =
      data.text.length + summaryLength + companyContextLength + managerNameLength;

    if (totalRequestChars > hardMaxChars) {
      ctx.issues.push({
        code: "custom",
        path: ["options"],
        message: `Combined request length (${totalRequestChars}) exceeds hardMaxChars (${hardMaxChars})`,
      });
      return;
    }

    if (totalRequestChars > maxChars) {
      ctx.issues.push({
        code: "custom",
        path: ["options"],
        message: `Combined request length (${totalRequestChars}) exceeds maxChars (${maxChars})`,
      });
    }
  });

export async function summarizeWithLlm(
  text: string,
  options: SummarizeOptions = {},
): Promise<{
  summary?: string;
  sentiment?: string;
  title?: string;
  callType?: string;
  callTopic?: string;
}> {
  const parsed = summarizeInputSchema.safeParse({ text, options });
  if (!parsed.success) {
    logger.warn("Некорректные параметры summarizeWithLlm", {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
    return DEFAULT_FALLBACK;
  }

  if (!hasAiProviderConfigured()) {
    return DEFAULT_FALLBACK;
  }

  const inputText = parsed.data.text;
  const inputOptions = parsed.data.options ?? {};
  const hardMaxChars = inputOptions.hardMaxChars ?? DEFAULT_HARD_MAX_CHARS;
  const maxChars = Math.min(inputOptions.maxChars ?? DEFAULT_MAX_CHARS, hardMaxChars);

  if (inputText.length > hardMaxChars) {
    logger.warn("Текст транскрипта превышает жесткий лимит для summarizeWithLlm", {
      textLength: inputText.length,
      hardMaxChars,
    });
    return DEFAULT_FALLBACK;
  }

  const sanitizedText = inputText.length > maxChars ? inputText.slice(0, maxChars) : inputText;
  const normalizedSummaryPrompt = inputOptions.summaryPrompt?.trim() || undefined;
  const normalizedModel = inputOptions.model?.trim() || undefined;

  const companyBlock = inputOptions.companyContext?.trim()
    ? `${inputOptions.companyContext.trim()}\n\nКРИТИЧЕСКИ ВАЖНО: Используй ТОЧНО это название компании в summary. НЕ изменяй написание, НЕ транслитерируй, НЕ переводи. Учитывай это при определении темы (topic), заголовка (title) и sentiment.\n\n`
    : "";

  const managerBlock = inputOptions.managerName?.trim()
    ? `МЕНЕДЖЕР:\nИмя менеджера (владелец номера): ${inputOptions.managerName.trim()}\n\n`
    : "";

  const defaultPrompt = `Проанализируй телефонный разговор и извлеки ключевую информацию:

1. summary — краткое содержание (2-3 предложения): что обсуждалось, какие решения приняты
2. sentiment — эмоциональный тон: Позитивный (клиент доволен), Нейтральный (деловой тон), Негативный (жалобы, недовольство)
3. title — заголовок звонка (3-7 слов): суть обращения
4. callType — тип обращения на верхнем уровне, универсальный для любого бизнеса
5. topic — конкретная тема/предмет обсуждения внутри типа

ПРАВИЛА ДЛЯ callType:
• Используй только одно из значений:
  Продажи | Поддержка | Биллинг | Логистика | Возврат/Рекламация | Жалоба | Консультация | Технический вопрос | Партнерство | Внутренний | Другое
• Если не уверен или разговор смешанный — выбирай наиболее доминирующий тип.
• Если невозможно определить доминирующий тип — ставь "Другое".

ВАЖНО ПРИ УПОМИНАНИИ БРЕНДОВ И ТЕРМИНОВ:
• Используй оригинальное написание из транскрипта
• Если бренд написан латиницей (Cisco, Danfoss, Microsoft) — сохраняй латиницу
• Если бренд написан кириллицей (Циско, Данфосс) — сохраняй кириллицу
• НЕ транслитерируй и НЕ переводи названия брендов
• Сохраняй точные названия продуктов и услуг из разговора

ВАЖНО ДЛЯ НАЗВАНИЯ КОМПАНИИ:
• Если в КОНТЕКСТЕ КОМПАНИИ указано название — ИСПОЛЬЗУЙ ТОЧНО ЭТО НАЗВАНИЕ в summary
• НЕ изменяй написание названия компании (не "Кибис" если "QBS", не "МегаФон" если "MegaFon")
• При упоминании компании в summary всегда используй название из контекста, даже если в транскрипте оно звучит иначе

Отвечай только на русском языке. Будь конкретным и лаконичным.`;

  const systemPrompt = companyBlock + managerBlock + (normalizedSummaryPrompt || defaultPrompt);

  const schema = z.object({
    summary: z.string().describe("Краткое содержание разговора (1-3 предложения)"),
    sentiment: z
      .string()
      .describe("Настроение разговора (например: Позитивный, Нейтральный, Негативный)"),
    title: z.string().describe("Краткий заголовок темы звонка"),
    callType: z.string().describe("Верхнеуровневый тип обращения из фиксированного списка"),
    topic: z.string().describe("Основная тема обсуждения"),
  });

  try {
    const { output: result } = await generateWithAi({
      model: normalizedModel,
      modelProfile: "default",
      system: systemPrompt,
      prompt: `Проанализируй следующий разговор:\n\n${sanitizedText}`,
      output: Output.object({ schema }),
      abortSignal: AbortSignal.timeout(LLM_CONFIG.SUMMARIZE_TIMEOUT_MS),
      functionId: "asr-summarize",
    });

    logger.info("LLM саммаризация завершена", {
      summaryLength: result.summary.length,
      sentiment: result.sentiment,
      callType: result.callType,
      topic: result.topic,
    });

    return {
      summary: result.summary,
      sentiment: result.sentiment,
      title: result.title,
      callType: result.callType,
      callTopic: result.topic,
    };
  } catch (error) {
    // Detect timeout/abort errors
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        error.message?.toLowerCase().includes("timeout") ||
        error.message?.toLowerCase().includes("aborted"));

    if (isTimeout) {
      logger.error("LLM саммаризация превысила таймаут", {
        timeout: LLM_CONFIG.SUMMARIZE_TIMEOUT_MS,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Превышено время ожидания ответа от LLM");
    }

    logger.error("Ошибка при генерации саммари", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { ...DEFAULT_FALLBACK };
  }
}
