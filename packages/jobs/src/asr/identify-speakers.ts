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

const DEFAULT_SYSTEM_PROMPT = `Ты анализируешь транскрипт телефонного разговора для определения ролей участников.

ЗАДАЧА: Определить, кто из спикеров является оператором компании, а кто — клиентом.

ПРИЗНАКИ ОПЕРАТОРА:
• Представляется от имени компании ("Компания X, здравствуйте")
• Задаёт уточняющие вопросы о заказе/услуге
• Предлагает решения, консультирует
• Использует профессиональную лексику
• Контролирует ход разговора

ПРИЗНАКИ КЛИЕНТА:
• Обращается с вопросом или проблемой
• Называет своё имя при представлении
• Спрашивает о статусе заказа/услуги
• Может выражать недовольство или благодарность

ИЗВЛЕЧЕНИЕ ИМЕНИ КЛИЕНТА:
• Ищи прямое представление: "Меня зовут...", "Это [Имя]", "Я [Имя Фамилия]"
• Ищи упоминание оператором: "Вы [Имя]?", "Уточните, [Имя]..."
• Извлекай полное имя, если доступно (Имя Фамилия)
• Если только имя — возвращай его
• Если имя не упоминается явно — оставь поле пустым

ФОРМАТ МАППИНГА:
• Оператор → "Оператор"
• Клиент без имени → "Клиент"
• Клиент с именем → "Клиент: [Имя]" или "Клиент: [Имя Фамилия]"

ВАЖНО:
• Не угадывай имя по контексту — только явные упоминания
• Если оба участника от компании — определи основного оператора
• Если несколько клиентов — пронумеруй ("Клиент 1", "Клиент 2")

Верни JSON с точным маппингом всех спикеров и именем клиента (если определено).`;

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
