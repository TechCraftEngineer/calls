/**
 * LLM-based проверка на автоответчик
 * Использует LLM для анализа полного транскрипта и определения, является ли он автоответчиком
 */

import { generateWithAi } from "@calls/ai";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../../../logger";

const logger = createLogger("answering-machine-llm");

const AnsweringMachineSchema = z.object({
  isAnsweringMachine: z.boolean().describe("Является ли транскрипт автоответчиком или голосовым меню"),
  confidence: z.enum(["high", "medium", "low"]).describe("Уверенность в определении"),
  reasoning: z.string().describe("Краткое объяснение почему это автоответчик или нет"),
});

export type AnsweringMachineResult = z.infer<typeof AnsweringMachineSchema>;

const SYSTEM_PROMPT = `Ты - эксперт по анализу телефонных разговоров. Твоя задача - определить, является ли предоставленный транскрипт автоответчиком (автоинформатором, голосовым меню) или реальным разговором между людьми.

Признаки автоответчика/голосового меню:
- Приветствие в стиле "Вы позвонили в компанию X"
- Предложение "оставьте сообщение после сигнала"
- Меню с цифрами ("нажмите 1 для...", "для связи с оператором нажмите 0")
- Монотонная речь без пауз на ответ
- Отсутствие диалога (вопрос-ответ)
- Записанные сообщения без интерактивности
- Приветствие с информацией о компании и дальнейшей тишиной

Признаки реального разговора:
- Диалог между двумя или более людьми
- Вопросы и ответы
- Естественные паузы
- Уточнения и уточняющие вопросы
- Обсуждение конкретных деталей
- Назначение встреч, уточнение адресов, времени
- Живое общение с эмоциями и интонациями (можно уловить по тексту)

Верни JSON с полями:
- isAnsweringMachine: true если это автоответчик/меню, false если реальный разговор
- confidence: "high" (уверен), "medium" (скорее всего), "low" (не уверен)
- reasoning: краткое объяснение (1-2 предложения)`;

export async function isAnsweringMachineWithLlm(
  transcript: string,
  callId: string,
): Promise<AnsweringMachineResult> {
  try {
    // Ограничиваем длину транскрипта для LLM (первые ~8000 токенов)
    const truncatedTranscript = transcript.length > 30000
      ? transcript.slice(0, 30000) + "... [транскрипт обрезан]"
      : transcript;

    const { output } = await generateWithAi({
      modelProfile: "cheap",
      system: SYSTEM_PROMPT,
      prompt: `Проанализируй следующий транскрипт телефонного звонка и определи, является ли он автоответчиком:\n\n${truncatedTranscript}`,
      output: Output.object({
        schema: AnsweringMachineSchema,
      }),
      functionId: "check-answering-machine",
      metadata: { callId },
    });

    const result = output as AnsweringMachineResult;

    logger.info("LLM определил тип звонка", {
      callId,
      isAnsweringMachine: result.isAnsweringMachine,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    return result;
  } catch (error) {
    logger.error("Ошибка при LLM проверке на автоответчик", {
      callId,
      error: error instanceof Error ? error.message : String(error),
    });

    // При ошибке считаем что это НЕ автоответчик (безопасный fallback)
    // чтобы не потерять реальные звонки
    return {
      isAnsweringMachine: false,
      confidence: "low",
      reasoning: "Ошибка при LLM анализе, используем безопасный fallback (не автоответчик)",
    };
  }
}
