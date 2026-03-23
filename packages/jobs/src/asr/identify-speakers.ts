/**
 * LLM-анализ спикеров: определение ролей (Оператор/Клиент) и извлечение имени клиента.
 * Заменяет метки "Спикер 1", "Спикер 2" на осмысленные подписи.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../logger";

const logger = createLogger("asr-identify-speakers");

const DEFAULT_SYSTEM_PROMPT = `Ты анализируешь транскрипт телефонного разговора для определения ролей и имён участников.

ГЛАВНОЕ ПРАВИЛО: ТОЛЬКО ИЗВЛЕКАЙ ИНФОРМАЦИЮ, НЕ ИЗМЕНЯЙ ТЕКСТ!
• ЗАПРЕЩЕНО изменять текст транскрипта
• ЗАПРЕЩЕНО добавлять или удалять слова
• ЗАПРЕЩЕНО исправлять грамматику или пунктуацию
• РАЗРЕШЕНО только заменять метки "Спикер N" на роли с именами

ЗАДАЧА: Для каждого спикера определить роль (оператор/клиент) и имя (если упоминается).

ПРИЗНАКИ ОПЕРАТОРА:
• Представляется от имени компании ("Компания X, здравствуйте", "Меня зовут [Имя], компания...")
• Задаёт уточняющие вопросы о заказе/услуге
• Предлагает решения, консультирует
• Использует профессиональную лексику
• Контролирует ход разговора
• Обычно говорит первым при исходящем звонке

ПРИЗНАКИ КЛИЕНТА:
• Обращается с вопросом или проблемой
• Отвечает на звонок ("Алло", "Да", "Слушаю")
• Спрашивает о статусе заказа/услуги
• Может выражать недовольство или благодарность
• Обычно отвечает первым при входящем звонке

ИЗВЛЕЧЕНИЕ ИМЁН (для ВСЕХ спикеров):

Прямое представление:
• "Меня зовут [Имя]" → извлекай имя
• "Это [Имя]" → извлекай имя
• "Я [Имя Фамилия]" → извлекай полное имя
• "[Имя], компания X" → извлекай имя оператора
• "[Имя] добрый день" → извлекай имя (обращение к собеседнику)

Обращение к собеседнику:
• "Вы [Имя]?" → это имя собеседника
• "[Имя], подскажите..." → это имя собеседника
• "Уточните, [Имя]..." → это имя собеседника

Правила извлечения имён:
• Извлекай ТОЧНОЕ имя из текста
• Если имя написано кириллицей — используй кириллицу ("Илья", "Никита")
• Если имя написано латиницей — используй латиницу ("John", "Mike")
• Если полное имя доступно — используй его (Имя Фамилия)
• Если только имя — возвращай его
• Если имя не упоминается явно — оставь поле пустым
• НЕ угадывай имя по контексту — только явные упоминания
• НЕ транслитерируй имена — используй как в тексте

ФОРМАТ ОТВЕТА (JSON):

Верни JSON со структурой:
{
  "speakers": [
    { "speakerId": "Спикер 1", "role": "operator", "name": "Никита" },
    { "speakerId": "Спикер 2", "role": "client", "name": "" }
  ],
  "operatorName": "Никита",
  "customerName": "Илья"
}

Поля:
• speakerId — точная метка из транскрипта ("Спикер 1", "Спикер 2" и т.д.)
• role — ТОЛЬКО "operator" или "client" (латиницей)
• name — имя спикера, если упоминается в разговоре; иначе пустая строка ""
• operatorName, customerName — имена для отчётов (если известны)

ВАЖНО:
• Определяй имена ОБОИХ участников, если они упоминаются
• Если оба участника от компании — определи основного оператора
• Если несколько клиентов — используй role "client" для всех, name различай
• НЕ изменяй сам текст транскрипта — только метки спикеров`;

const speakerSchema = z.object({
  speakerId: z
    .string()
    .describe('Метка спикера из транскрипта, напр. "Спикер 1"'),
  role: z.enum(["operator", "client"]).describe("Роль: operator или client"),
  name: z.string().describe("Имя, если упоминается; иначе пустая строка"),
});

const schema = z.object({
  speakers: z.array(speakerSchema).describe("Массив спикеров с ролью и именем"),
  operatorName: z
    .string()
    .optional()
    .describe(
      "Имя оператора, если упоминается в разговоре (только имя или полное имя)",
    ),
  customerName: z
    .string()
    .optional()
    .describe(
      "Имя клиента, если упоминается в разговоре (только имя или полное имя)",
    ),
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

  const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}${options.managerName ? `\n\nПодсказка: оператор может представляться как ${options.managerName}.` : ""}`;

  const start = Date.now();

  try {
    const response = await generateWithAi({
      modelProfile: "cheap",
      system: systemPrompt,
      prompt: `Проанализируй разговор и определи роли и имена всех спикеров. Верни JSON со структурой speakers (массив {speakerId, role, name}), operatorName и customerName.

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

    let result: z.infer<typeof schema>;
    try {
      result = response.output;
    } catch (outputError) {
      const msg =
        outputError instanceof Error
          ? outputError.message
          : String(outputError);
      if (msg.includes("No output generated") && response.text?.trim()) {
        result = schema.parse(JSON.parse(response.text));
      } else {
        throw outputError;
      }
    }

    const operatorName = result.operatorName?.trim() || undefined;
    const customerName = result.customerName?.trim() || undefined;

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
      return { text: normalizedText, operatorName, customerName };
    }

    let resultText = normalizedText;
    for (const [from, to] of Object.entries(sanitizedMapping)) {
      if (from && to) {
        const regex = new RegExp(`^(${escapeRegex(from)}):\\s*`, "gm");
        resultText = resultText.replace(regex, `${to}: `);
      }
    }

    logger.info("Анализ спикеров завершён", {
      processingTimeMs: Date.now() - start,
      mappingKeys: Object.keys(sanitizedMapping).length,
      operatorName: operatorName ?? null,
      customerName: customerName ?? null,
    });

    return { text: resultText.trim(), operatorName, customerName };
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
