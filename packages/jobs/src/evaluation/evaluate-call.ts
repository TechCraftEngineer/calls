/**
 * LLM-оценка звонка:
 * - value_score (1–5) — ценность звонка для бизнеса
 * - value_explanation — объяснение оценки ценности
 * - manager_score (1–5) — качество работы менеджера
 * - manager_feedback — обратная связь по коммуникации менеджера
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { Output } from "ai";
import { z } from "zod";
import { createLogger } from "../logger";

const logger = createLogger("evaluation-evaluate");

export interface EvaluateCallOptions {
  evaluationPrompt?: string;
  companyContext?: string | null;
  model?: string;
}

export interface CallEvaluationResult {
  isQualityAnalyzable: boolean;
  notAnalyzableReason: string | null;
  valueScore: number | null;
  valueExplanation: string;
  managerScore: number | null;
  managerFeedback: string;
}

const DEFAULT_FALLBACK: CallEvaluationResult = {
  isQualityAnalyzable: true,
  notAnalyzableReason: null,
  valueScore: 3,
  valueExplanation: "Оценка недоступна — недостаточно данных или AI не настроен",
  managerScore: 3,
  managerFeedback: "Оценка недоступна",
};

const EVALUATION_SYSTEM_PROMPT = `Ты эксперт по анализу телефонных переговоров в B2B-продажах и поддержке. Оцени звонок по двум критериям.

## 1. Ценность звонка (value_score, 1–5)
Оцени бизнес-ценность разговора:
- 5 — Высокая ценность: сделка закрыта/оформлена, крупный заказ, важный клиент удержан, решена критическая проблема
- 4 — Значительная: прогресс к сделке, договорённости, повторный заказ, позитивная обратная связь
- 3 — Средняя: консультация, уточнения, обычный информационный запрос
- 2 — Низкая: только выяснение, без конкретики, клиент не заинтересован
- 1 — Минимальная: технический сбой, пустой разговор, отказ без диалога

value_explanation — конкретно: почему такая оценка, что произошло в разговоре.

## 2. Качество работы менеджера (manager_score, 1–5)

Оцени по совокупности:
- Эмпатия: услышал клиента? переспрашивал для уточнения?
- Структура: приветствие, итоги, завершение
- Продажные навыки: выявил потребности, предложил решение, работал с возражениями

Шкала:
- 5 — Отлично: все элементы присутствуют, менеджер проактивен
- 4 — Хорошо: основные элементы есть, мелкие недочёты
- 3 — Удовлетворительно: базовый уровень, пассивная позиция
- 2 — Плохо: упущены важные моменты, невнимательность
- 1 — Критично: конфликт, некомпетентность

manager_feedback — что было хорошо (пример из разговора), что улучшить (конкретный совет).

## Обработка особых случаев

Автоответчик/робот или нет диалога менеджера с клиентом:
- is_quality_analyzable = false
- not_analyzable_reason = "autoanswerer"
- value_score = null, manager_score = null
- Объясни почему исключён

Слишком короткий (< 30 сек) или неразборчивый:
- is_quality_analyzable = false
- not_analyzable_reason = "too_short" | "poor_audio_quality"
- Объясни причину

ВАЖНО:
• Используй название компании из контекста ТОЧНО (не меняй написание)
• Отвечай только на русском
• Без markdown в JSON`;

export async function evaluateCallWithLlm(
  transcriptText: string,
  options: EvaluateCallOptions = {},
): Promise<CallEvaluationResult> {
  const text = transcriptText?.trim() ?? "";
  if (!text) {
    logger.warn("Пустой транскрипт — возвращаем fallback");
    return DEFAULT_FALLBACK;
  }
  if (!hasAiProviderConfigured()) {
    logger.warn("AI провайдер не настроен — возвращаем fallback");
    return DEFAULT_FALLBACK;
  }

  const schema = z.object({
    is_quality_analyzable: z.boolean().describe("Можно ли оценивать качество менеджера по звонку"),
    not_analyzable_reason: z
      .string()
      .nullable()
      .describe('Причина неанализируемости (например, "autoanswerer")'),
    value_score: z.number().min(1).max(5).nullable().describe("Ценность звонка для бизнеса (1–5)"),
    value_explanation: z.string().describe("Краткое объяснение оценки ценности (1–2 предложения)"),
    manager_score: z.number().min(1).max(5).nullable().describe("Качество работы менеджера (1–5)"),
    manager_feedback: z
      .string()
      .describe("Обратная связь по коммуникации менеджера (1–2 предложения)"),
  });

  const companyBlock = options.companyContext?.trim()
    ? `${options.companyContext.trim()}\n\nКРИТИЧЕСКИ ВАЖНО: Используй ТОЧНО это название компании при оценке. НЕ изменяй написание, НЕ транслитерируй, НЕ переводи. Учитывай специфику бизнеса при оценке value_score и manager_score.\n\n`
    : "";

  const evaluationPrompt = companyBlock + (options.evaluationPrompt || EVALUATION_SYSTEM_PROMPT);

  try {
    const { output: result } = await generateWithAi({
      model: options.model,
      modelProfile: "premium",
      system: evaluationPrompt,
      prompt: `Оцени следующий телефонный разговор:\n\n${text}`,
      output: Output.object({ schema }),
      functionId: "evaluation-evaluate-call",
    });

    const isQualityAnalyzable = result.is_quality_analyzable !== false;
    const notAnalyzableReason = isQualityAnalyzable
      ? null
      : result.not_analyzable_reason?.trim() || "autoanswerer";

    // Логируем причину, если звонок не подлежит анализу качества
    if (!isQualityAnalyzable) {
      logger.info("Звонок не анализируется по качеству", {
        reason: notAnalyzableReason,
      });
    }

    const valueScore = isQualityAnalyzable
      ? typeof result.value_score === "number"
        ? Math.min(5, Math.max(1, Math.round(result.value_score)))
        : null
      : null;
    const managerScore = isQualityAnalyzable
      ? typeof result.manager_score === "number"
        ? Math.min(5, Math.max(1, Math.round(result.manager_score)))
        : null
      : null;

    logger.info("LLM оценка завершена", {
      isQualityAnalyzable,
      notAnalyzableReason,
      valueScore,
      managerScore,
      valueExplanationLength: result.value_explanation.length,
    });

    return {
      isQualityAnalyzable,
      notAnalyzableReason,
      valueScore,
      valueExplanation: result.value_explanation.trim(),
      managerScore,
      managerFeedback: result.manager_feedback.trim(),
    };
  } catch (error) {
    logger.error("Ошибка при оценке звонка", {
      error: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_FALLBACK;
  }
}
