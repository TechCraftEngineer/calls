/**
 * LLM-анализ спикеров: определение ролей (Оператор/Клиент) и извлечение имени клиента.
 * Заменяет метки "Спикер 1", "Спикер 2" на осмысленные подписи.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { LLM_CONFIG } from "@calls/config";
import { createLogger } from "@calls/logger";
import { Output } from "ai";
import { z } from "zod";

const logger = createLogger("asr-identify-speakers");
const MAX_ANALYSIS_CHARS = 20_000;

const DEFAULT_SYSTEM_PROMPT = `Определи роль каждого спикера в телефонном разговоре.

ВЫВОД (строго JSON):
{
  "speakers": [
    {"speakerId": "Спикер 1", "role": "operator", "name": "Имя или пусто"},
    {"speakerId": "Спикер 2", "role": "client", "name": ""}
  ],
  "operatorName": "Имя оператора или пусто",
  "customerName": "Имя клиента или пусто"
}

ПРИЗНАКИ ОПЕРАТОРА (по приоритету):
1. Говорит "компания X", "менеджер", "оператор"
2. Представляется первым при исходящем, отвечает вторым при входящем
3. Задаёт уточняющие вопросы, предлагает варианты
4. Проверяет информацию, берёт на контроль

ПРИЗНАКИ КЛИЕНТА:
1. Обращается с вопросом/проблемой/запросом
2. Отвечает на вопросы оператора
3. Уточняет детали заказа/услуги

ИМЕНА:
- Извлекай ТОЛЬКО явно названные имена из реплик
- Формат: имя или "Имя Фамилия"
- НЕ транслитерируй, НЕ переводи
- "Вы Илья?" → customerName: "Илья" (клиент, если оператор спрашивает)
- "Меня зовут Мария" → operatorName: "Мария" (если говорит оператор), customerName: "Мария" (если говорит клиент)

ПРАВИЛА:
- Каждый speakerId в speakers должен иметь ровно одну роль
- Если не уверен в роли — выбери наиболее вероятную по приоритетам
- Имя только при явном упоминании, иначе ""`;

const FALLBACK_SYSTEM_PROMPT = `Определи роли спикеров в коротком разговоре.
Верни JSON: {"speakers": [{"speakerId": "...", "role": "operator", "name": ""}, {"speakerId": "...", "role": "client", "name": ""}], "operatorName": "", "customerName": ""}
Правило: кто первым представляет компанию или задаёт вопросы — operator, кто отвечает на вопросы — client.`;

const speakerSchema = z.object({
  speakerId: z.string().describe('Метка спикера из транскрипта, напр. "Спикер 1"'),
  role: z.enum(["operator", "client"]).describe("Роль: operator или client"),
  name: z.string().describe("Имя, если упоминается; иначе пустая строка"),
});

const schema = z.object({
  speakers: z.array(speakerSchema).describe("Массив спикеров с ролью и именем"),
  operatorName: z
    .string()
    .optional()
    .describe("Имя оператора, если упоминается в разговоре (только имя или полное имя)"),
  customerName: z
    .string()
    .optional()
    .describe("Имя клиента, если упоминается в разговоре (только имя или полное имя)"),
});

export interface IdentifySpeakersOptions {
  direction?: string | null;
  managerName?: string | null;
  workspaceId: string;
}

export interface IdentifySpeakersResult {
  text: string;
  operatorName?: string;
  customerName?: string;
  metadata?: IdentifySpeakersMetadata;
}

export interface IdentifySpeakersMetadata {
  success: boolean;
  reason?: "empty_input" | "ai_provider_not_configured" | "error";
  error?: string;
  mapping?: Record<string, string>;
  speakers?: z.infer<typeof speakerSchema>[];
  operatorName?: string | null;
  customerName?: string | null;
  truncatedForAnalysis?: boolean;
}

export async function identifySpeakersWithLlm(
  normalizedText: string,
  options: IdentifySpeakersOptions,
): Promise<IdentifySpeakersResult> {
  if (!normalizedText?.trim()) {
    return {
      text: normalizedText,
      metadata: {
        success: false,
        reason: "empty_input",
      },
    };
  }

  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, пропускаем анализ спикеров");
    return {
      text: normalizedText,
      metadata: {
        success: false,
        reason: "ai_provider_not_configured",
      },
    };
  }

  const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}${options.managerName ? `\n\nПодсказка: оператор может представляться как ${options.managerName}.` : ""}`;
  const analysisText =
    normalizedText.length > MAX_ANALYSIS_CHARS
      ? normalizedText.slice(0, MAX_ANALYSIS_CHARS)
      : normalizedText;

  const start = Date.now();

  try {
    let response: Awaited<ReturnType<typeof generateWithAi>>;
    try {
      response = await generateWithAi({
        modelProfile: "cheap",
        system: systemPrompt,
        prompt: `Проанализируй транскрипт и верни только JSON по заданной схеме.

Транскрипт (не изменяй, используй как источник фактов):
---
${analysisText}
---`,
        output: Output.object({ schema }),
        temperature: 0.2,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(LLM_CONFIG.SPEAKER_IDENTIFICATION_TIMEOUT_MS),
        functionId: "asr-identify-speakers",
      });
    } catch (primaryError) {
      logger.warn("Primary speaker-identification prompt failed, retry fallback", {
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });
      response = await generateWithAi({
        modelProfile: "cheap",
        system: `${FALLBACK_SYSTEM_PROMPT}${options.managerName ? `\nПодсказка: оператор может быть ${options.managerName}.` : ""}`,
        prompt: `Транскрипт:
---
${analysisText}
---`,
        output: Output.object({ schema }),
        temperature: 0.1,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(LLM_CONFIG.SPEAKER_IDENTIFICATION_TIMEOUT_MS),
        functionId: "asr-identify-speakers-fallback",
      });
    }

    let result: z.infer<typeof schema>;
    try {
      result = response.output;
    } catch (outputError) {
      const msg = outputError instanceof Error ? outputError.message : String(outputError);
      if (msg.includes("No output generated") && response.text?.trim()) {
        result = schema.parse(JSON.parse(response.text));
      } else {
        throw outputError;
      }
    }

    const operatorName =
      result.operatorName?.trim() ||
      result.speakers?.find((s) => s.role === "operator" && s.name?.trim())?.name?.trim() ||
      undefined;
    const customerName =
      result.customerName?.trim() ||
      result.speakers?.find((s) => s.role === "client" && s.name?.trim())?.name?.trim() ||
      undefined;

    const sanitizedMapping: Record<string, string> = {};
    for (const s of result.speakers ?? []) {
      const id = s.speakerId?.trim();
      if (!id) continue;
      const name = s.name?.trim();
      const isOperator = s.role?.toLowerCase() === "operator";
      const label = isOperator
        ? name
          ? `Оператор: ${name}`
          : "Оператор"
        : name
          ? `Клиент: ${name}`
          : "Клиент";
      sanitizedMapping[id] = label;
    }

    // Если у нас есть известное имя менеджера из системы, используем его как operatorName
    // Это предотвращает путаницу когда LLM присваивает имя менеджера клиенту
    const finalOperatorName = operatorName ?? options.managerName ?? undefined;
    const finalCustomerName = customerName; // customerName определяется только из разговора

    if (Object.keys(sanitizedMapping).length === 0) {
      logger.info("Маппинг спикеров пуст, возвращаем исходный текст");
      return {
        text: normalizedText,
        operatorName: finalOperatorName,
        customerName: finalCustomerName,
        metadata: {
          success: true,
          mapping: sanitizedMapping,
          speakers: result.speakers,
          operatorName: finalOperatorName ?? null,
          customerName: finalCustomerName ?? null,
          truncatedForAnalysis: normalizedText.length > analysisText.length,
        },
      };
    }

    // Не заменяем speakerId в тексте, оставляем оригинальные метки
    // Роли и имена для отображения передаются в metadata.mapping
    const resultText = normalizedText;

    logger.info("Анализ спикеров завершён", {
      processingTimeMs: Date.now() - start,
      mappingKeys: Object.keys(sanitizedMapping).length,
      truncatedForAnalysis: normalizedText.length > analysisText.length,
      operatorName: finalOperatorName ?? null,
      customerName: finalCustomerName ?? null,
      managerNameFromOptions: options.managerName ?? null,
    });

    return {
      text: resultText.trim(),
      operatorName: finalOperatorName,
      customerName: finalCustomerName,
      metadata: {
        success: true,
        mapping: sanitizedMapping,
        speakers: result.speakers,
        operatorName: finalOperatorName ?? null,
        customerName: finalCustomerName ?? null,
        truncatedForAnalysis: normalizedText.length > analysisText.length,
      },
    };
  } catch (error) {
    logger.error("Ошибка анализа спикеров", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      text: normalizedText,
      metadata: {
        success: false,
        reason: "error",
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
