/**
 * LLM-анализ спикеров: определение ролей (Оператор/Клиент) и извлечение имени клиента.
 * Заменяет метки "Спикер 1", "Спикер 2" на осмысленные подписи.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { env } from "@calls/config";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../logger";

const logger = createLogger("asr-identify-speakers");

const DEFAULT_SYSTEM_PROMPT = `Ты анализируешь транскрипт телефонного разговора между оператором компании и клиентом.

Определи для каждого спикера:
1. Кто говорит от имени компании (оператор/менеджер) — подпиши "Оператор"
2. Клиент — подпиши "Клиент" или "Клиент: [Имя Фамилия]", если имя упоминается в разговоре

Верни JSON с маппингом спикеров и именем клиента (если определимо).`;

const schema = z.object({
  speakerMapping: z
    .record(z.string(), z.string())
    .describe(
      'Маппинг "Спикер 1" -> "Оператор", "Спикер 2" -> "Клиент: Иван Петров"',
    ),
  customerName: z
    .string()
    .optional()
    .describe(
      "Имя клиента, если упоминается в разговоре (только имя, без фамилии или полное)",
    ),
});

export interface IdentifySpeakersOptions {
  direction?: string | null;
  managerName?: string | null;
  workspaceId: string;
  getPrompt: (key: string, workspaceId: string) => Promise<string | null>;
}

export interface IdentifySpeakersResult {
  text: string;
  customerName?: string;
}

export async function identifySpeakersWithLlm(
  normalizedText: string,
  options: IdentifySpeakersOptions,
): Promise<IdentifySpeakersResult> {
  if (!normalizedText?.trim()) {
    return { text: normalizedText };
  }

  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, пропускаем анализ спикеров");
    return { text: normalizedText };
  }

  const promptKey =
    options.direction === "Входящий" || options.direction === "incoming"
      ? "speaker_analysis_incoming"
      : "speaker_analysis_outgoing";

  const customPrompt = await options.getPrompt(promptKey, options.workspaceId);
  const systemPrompt =
    customPrompt ??
    `${DEFAULT_SYSTEM_PROMPT}${options.managerName ? `\n\nПодсказка: оператор может представляться как ${options.managerName}.` : ""}`;

  const start = Date.now();

  try {
    const { output: result } = await generateWithAi({
      model: env.AI_MODEL ?? "gpt-4o-mini",
      system: systemPrompt,
      prompt: `Проанализируй разговор и определи роли спикеров. Верни JSON с speakerMapping и customerName (если известно).

Транскрипт:
---
${normalizedText}
---`,
      output: Output.object({ schema }),
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(30_000),
      functionId: "asr-identify-speakers",
    });

    const mapping = result.speakerMapping ?? {};
    const customerName = result.customerName?.trim() || undefined;

    if (Object.keys(mapping).length === 0) {
      logger.info("Маппинг спикеров пуст, возвращаем исходный текст");
      return { text: normalizedText, customerName };
    }

    let resultText = normalizedText;
    for (const [from, to] of Object.entries(mapping)) {
      if (from && to) {
        const regex = new RegExp(`^(${escapeRegex(from)}):\\s*`, "gm");
        resultText = resultText.replace(regex, `${to}: `);
      }
    }

    logger.info("Анализ спикеров завершён", {
      processingTimeMs: Date.now() - start,
      mappingKeys: Object.keys(mapping).length,
      customerName: customerName ?? null,
    });

    return { text: resultText.trim(), customerName };
  } catch (error) {
    logger.error("Ошибка анализа спикеров", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { text: normalizedText };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
