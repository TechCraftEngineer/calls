/**
 * Inngest функция: оценка звонка по транскрипту.
 * Запускает LLM-анализ и сохраняет оценку (value_score, manager_score и т.д.).
 */

import { callsService } from "@calls/db";
import { evaluateCallWithLlm } from "../../evaluation";
import { createLogger } from "../../logger";
import { inngest } from "../client";

const logger = createLogger("evaluate-call");

export const evaluateCallFn = inngest.createFunction(
  {
    id: "evaluate-call",
    name: "Оценка звонка (LLM анализ транскрипта)",
    retries: 2,
    concurrency: {
      limit: 5,
      key: "event.data.callId",
    },
  },
  { event: "call/evaluate.requested" },
  async ({ event, step }) => {
    const { callId } = event.data as { callId: string };
    if (!callId) {
      throw new Error("callId обязателен");
    }

    const call = await step.run("get-call", async () => {
      const c = await callsService.getCall(callId);
      if (!c) throw new Error(`Звонок не найден: ${callId}`);
      return c;
    });

    const transcript = await step.run("get-transcript", async () => {
      return callsService.getTranscriptByCallId(callId);
    });

    const transcriptText =
      transcript?.text?.trim() ?? transcript?.rawText?.trim() ?? "";
    if (!transcriptText) {
      logger.warn("Транскрипт пуст — пропускаем оценку", { callId });
      return { callId, skipped: true, reason: "empty_transcript" };
    }

    const evaluation = await step.run("evaluate", async () => {
      return evaluateCallWithLlm(transcriptText);
    });

    await step.run("save-evaluation", async () => {
      await callsService.addEvaluation({
        callId,
        valueScore: evaluation.valueScore,
        valueExplanation: evaluation.valueExplanation,
        managerScore: evaluation.managerScore,
        managerFeedback: evaluation.managerFeedback,
      });
      logger.info("Оценка сохранена", {
        callId,
        valueScore: evaluation.valueScore,
        managerScore: evaluation.managerScore,
      });
    });

    return {
      callId,
      valueScore: evaluation.valueScore,
      managerScore: evaluation.managerScore,
    };
  },
);
