/**
 * Раннее определение автоответчика по тексту транскрипта через LLM.
 * Используется сразу после базового ASR, до дорогих операций (speaker identification).
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../logger";

const logger = createLogger("answering-machine-detection");

// Максимальная длина текста для анализа
const MAX_TEXT_LENGTH = 1500;

interface DetectionResult {
  isAnsweringMachine: boolean;
  confidence: "high" | "medium" | "low";
  method: "llm" | "fallback";
}

/**
 * LLM-определение автоответчика
 */
async function checkWithLlm(text: string): Promise<DetectionResult> {
  if (!hasAiProviderConfigured()) {
    return { isAnsweringMachine: false, confidence: "low", method: "fallback" };
  }

  const schema = z.object({
    is_answering_machine: z
      .boolean()
      .describe("Является ли это записью автоответчика, голосового меню или робота"),
    confidence: z
      .enum(["high", "medium", "low"])
      .describe("Уверенность в определении (high - явный автоответчик, low - непонятно)"),
    reason: z.string().describe("Краткое объяснение почему"),
  });

  const systemPrompt = `Ты анализируешь текст телефонного звонка. Определи, является ли это:
- АВТООТВЕТЧИКОМ (answering machine, voicemail, recorded message)
- ГОЛОСОВЫМ МЕНЮ (IVR, робот с меню "нажмите 1 для...")
- РЕАЛЬНЫМ РАЗГОВОРОМ менеджера с клиентом

Признаки автоответчика/робота:
- Приветствие компании без реального диалога
- "Оставьте сообщение после гудка"
- Механический голос, повторяющиеся фразы
- "Нажмите 1 для... Нажмите 2 для..."
- Только гудок или тишина
- "Звонок переводится..."

Признаки реального разговора:
- Есть вопросы и ответы между людьми
- Контекст обсуждения заказа/проблемы
- Естественные реакции ("ага", "понял", "хорошо")

Отвечай только в формате JSON. Будь консервативным - если сомневаешься, выбирай low confidence.`;

  try {
    const { output: result } = await generateWithAi({
      modelProfile: "fast", // Используем быструю модель для скорости
      system: systemPrompt,
      prompt: `Определи тип звонка:\n\n${text}`,
      output: Output.object({ schema }),
      functionId: "detect-answering-machine",
    });

    logger.info("LLM детекция автоответчика", {
      isAnsweringMachine: result.is_answering_machine,
      confidence: result.confidence,
      reason: result.reason,
    });

    return {
      isAnsweringMachine: result.is_answering_machine,
      confidence: result.confidence,
      method: "llm",
    };
  } catch (error) {
    logger.warn("Ошибка LLM-детекции автоответчика", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { isAnsweringMachine: false, confidence: "low", method: "fallback" };
  }
}

/**
 * Определяет, является ли звонок автоответчиком через LLM.
 *
 * @param text - Текст транскрипта (обычно non-diarized ASR результат)
 * @returns DetectionResult с результатом анализа
 */
export async function detectAnsweringMachine(text: string): Promise<DetectionResult> {
  const trimmedText = text?.trim() ?? "";

  if (!trimmedText) {
    return { isAnsweringMachine: false, confidence: "low", method: "fallback" };
  }

  // Обрезаем текст для быстрого анализа
  const analysisText =
    trimmedText.length > MAX_TEXT_LENGTH ? trimmedText.substring(0, MAX_TEXT_LENGTH) : trimmedText;

  // Только LLM анализ
  return checkWithLlm(analysisText);
}

/**
 * Проверяет, нужно ли пропускать дорогие операции для этого звонка.
 *
 * @param text - Текст транскрипта
 * @returns true если это автоответчик и нужно пропустить speaker identification и оценку
 */
export async function shouldSkipExpensiveProcessing(text: string): Promise<boolean> {
  const result = await detectAnsweringMachine(text);
  // Пропускаем если уверены что это автоответчик (high или medium confidence)
  return result.isAnsweringMachine && result.confidence !== "low";
}
