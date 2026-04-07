/**
 * Раннее определение автоответчика по тексту транскрипта.
 * Используется сразу после базового ASR, до дорогих операций (diarization, speaker identification).
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../logger";

const logger = createLogger("answering-machine-detection");

// Максимальная длина текста для анализа
const MAX_TEXT_LENGTH = 1500;

// Быстрые эвристики для определения автоответчика (до вызова LLM)
const AUTOANSWERER_KEYWORDS = [
  "автоответчик",
  "автоматическая система",
  "записывающее устройство",
  "гудок",
  "подождите на линии",
  "наберите",
  "добро пожаловать в голосовое меню",
  "вы позвонили в",
  "компания не может принять звонок",
  "оставьте сообщение после сигнала",
  "после гудка",
  "перевод звонка",
  "соединяю с",
  "перевожу на",
];

const AUTOANSWERER_PATTERNS = [
  /^\s*гудок\s*$/i,
  /^\s*\*\s*\d+\s*$/,
  /приветствуем\s*вас.*нажмите/i,
  /добро\s*пожаловать.*меню/i,
  /компания.*не\s*может.*ответить/i,
  /звонок\s*переводится/i,
  /соединяю\s*с/i,
];

interface DetectionResult {
  isAnsweringMachine: boolean;
  confidence: "high" | "medium" | "low";
  method: "heuristic" | "llm" | "fallback";
}

/**
 * Проверка текста на признаки автоответчика с помощью эвристик
 */
function checkHeuristics(text: string): DetectionResult | null {
  const lowerText = text.toLowerCase();

  // Проверяем ключевые слова
  const keywordMatches = AUTOANSWERER_KEYWORDS.filter((kw) =>
    lowerText.includes(kw.toLowerCase()),
  );

  // Проверяем паттерны
  const patternMatches = AUTOANSWERER_PATTERNS.filter((pattern) =>
    pattern.test(text),
  );

  // Если много совпадений или есть явные паттерны - считаем автоответчиком
  if (patternMatches.length > 0 || keywordMatches.length >= 2) {
    return {
      isAnsweringMachine: true,
      confidence: patternMatches.length > 0 ? "high" : "medium",
      method: "heuristic",
    };
  }

  // Если совсем короткий текст (< 20 слов) и нет вопросов - возможно автоответчик
  const wordCount = text.split(/\s+/).length;
  const hasQuestions = /\?/.test(text);

  if (wordCount < 20 && !hasQuestions && keywordMatches.length > 0) {
    return {
      isAnsweringMachine: true,
      confidence: "low",
      method: "heuristic",
    };
  }

  return null; // Не определили через эвристики - нужен LLM
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
 * Определяет, является ли звонок автоответчиком.
 * Использует эвристики + LLM для высокой точности.
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
    trimmedText.length > MAX_TEXT_LENGTH
      ? trimmedText.substring(0, MAX_TEXT_LENGTH)
      : trimmedText;

  // Сначала пробуем эвристики (быстро и дёшево)
  const heuristicResult = checkHeuristics(analysisText);

  if (heuristicResult?.confidence === "high") {
    logger.info("Автоответчик определён через эвристики (high confidence)", {
      method: "heuristic",
      textLength: analysisText.length,
    });
    return heuristicResult;
  }

  // Если эвристики не уверены - используем LLM
  const llmResult = await checkWithLlm(analysisText);

  logger.info("Результат детекции автоответчика", {
    method: llmResult.method,
    confidence: llmResult.confidence,
    isAnsweringMachine: llmResult.isAnsweringMachine,
    textLength: analysisText.length,
  });

  return llmResult;
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
