/**
 * LLM-анализ спикеров: определение ролей (Оператор/Клиент) и извлечение имени клиента.
 * Заменяет метки "Спикер 1", "Спикер 2" на осмысленные подписи.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { createLogger } from "@calls/logger";
import { Output } from "ai";
import { z } from "zod";

const logger = createLogger("asr-identify-speakers");
const MAX_ANALYSIS_CHARS = 20_000;

const DEFAULT_SYSTEM_PROMPT = `Ты эксперт по разметке телефонных диалогов. Определи роль и имя каждого спикера.

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
1) Возвращай ТОЛЬКО JSON-объект в требуемой структуре.
2) Ничего не переписывай и не "улучшай" в исходном тексте транскрипта.
3) Не придумывай факты. Любая неопределённость решается в пользу пустого имени ("").

ЦЕЛЕВАЯ СТРУКТУРА:
{
  "speakers": [
    { "speakerId": "Спикер 1", "role": "operator", "name": "Никита" },
    { "speakerId": "Спикер 2", "role": "client", "name": "" }
  ],
  "operatorName": "Никита",
  "customerName": "Илья"
}

ПРАВИЛА ПО ПОЛЯМ:
- speakers: перечисли ВСЕХ уникальных спикеров из транскрипта.
- speakerId: точная метка из текста (без изменений, один в один).
- role: только "operator" или "client".
- name: имя этого спикера, если явно названо; иначе "".
- operatorName/customerName: имя оператора и клиента, если известно; иначе "".

ПРИОРИТЕТЫ ДЛЯ ОПРЕДЕЛЕНИЯ РОЛИ (сверху вниз):
1) Явная самопрезентация от компании: "компания ...", "оператор ...", "меня зовут ..., компания ...".
2) Речевое поведение: оператор ведёт процесс (уточняет, предлагает, проверяет данные), клиент обращается с запросом/проблемой.
3) Контекст звонка: при исходящем чаще первым говорит оператор; при входящем первым чаще отвечает клиент.
4) Если уверенности нет, выбери наиболее вероятную роль по совокупности признаков, но не выдумывай имя.

ИЗВЛЕЧЕНИЕ ИМЁН:
- Извлекай только явные упоминания в репликах.
- Сохраняй написание как в тексте (кириллица/латиница, без транслитерации).
- Если есть "Имя Фамилия", возвращай полное значение.
- Обращение к собеседнику ("Илья, ...", "Вы Илья?") — это имя собеседника, не говорящего.
- Не подставляй имя по догадке или по косвенным признакам.

КОНСИСТЕНТНОСТЬ:
- Один и тот же speakerId должен иметь ровно одну роль.
- Если у спикера name пустой, это нормально.
- Если операторов/клиентов несколько, для всех используй соответствующую role.
- operatorName/customerName возьми из speakers по ролям; если кандидатов несколько — выбери наиболее явно подтверждённого.`;

const FALLBACK_SYSTEM_PROMPT = `Определи роли и имена спикеров в телефонном транскрипте.
Верни только JSON в структуре:
{
  "speakers": [{ "speakerId": "Спикер 1", "role": "operator|client", "name": "" }],
  "operatorName": "",
  "customerName": ""
}
Правила: speakerId копируй точно, role только operator/client, имя только при явном упоминании, иначе "".`;

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
        abortSignal: AbortSignal.timeout(600_000),
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
        abortSignal: AbortSignal.timeout(600_000),
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

    const operatorName = result.operatorName?.trim() || result.speakers?.find(s => s.role === 'operator')?.name?.trim() || undefined;
    const customerName = result.customerName?.trim() || result.speakers?.find(s => s.role === 'client')?.name?.trim() || undefined;

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

    if (Object.keys(sanitizedMapping).length === 0) {
      logger.info("Маппинг спикеров пуст, возвращаем исходный текст");
      return {
        text: normalizedText,
        operatorName,
        customerName,
        metadata: {
          success: true,
          mapping: sanitizedMapping,
          speakers: result.speakers,
          operatorName: operatorName ?? null,
          customerName: customerName ?? null,
          truncatedForAnalysis: normalizedText.length > analysisText.length,
        },
      };
    }

    let resultText = normalizedText;
    for (const [from, to] of Object.entries(sanitizedMapping)) {
      if (from && to) {
        const regex = new RegExp(`^(${escapeRegex(from)}):\\s*`, "gm");
        resultText = resultText.replace(regex, `${to} `);
      }
    }

    logger.info("Анализ спикеров завершён", {
      processingTimeMs: Date.now() - start,
      mappingKeys: Object.keys(sanitizedMapping).length,
      truncatedForAnalysis: normalizedText.length > analysisText.length,
      operatorName: operatorName ?? null,
      customerName: customerName ?? null,
    });

    return {
      text: resultText.trim(),
      operatorName,
      customerName,
      metadata: {
        success: true,
        mapping: sanitizedMapping,
        speakers: result.speakers,
        operatorName: operatorName ?? null,
        customerName: customerName ?? null,
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
