/**
 * Inngest функция: оценка звонка по транскрипту.
 * Запускает LLM-анализ и сохраняет оценку (value_score, manager_score и т.д.).
 * Использует шаблон оценки пользователя (по internal_number) или workspace default.
 */

import {
  callsService,
  promptsRepository,
  usersRepository,
  userWorkspaceSettingsRepository,
} from "@calls/db";
import {
  type EvaluationTemplateSlug,
  evaluateCallWithLlm,
  getEvaluationPrompt,
} from "../../evaluation";
import { createLogger } from "../../logger";
import { inngest } from "../client";

const logger = createLogger("evaluate-call");

const DEFAULT_TEMPLATE: EvaluationTemplateSlug = "general";

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

    const evaluationPrompt = await step.run("resolve-template", async () => {
      let templateSlug: EvaluationTemplateSlug = DEFAULT_TEMPLATE;
      let customInstructions: string | null = null;
      let userHasTemplate = false;

      const user = await usersRepository.findUserByInternalNumber(
        call.workspaceId,
        call.internalNumber,
      );

      if (user) {
        const settings =
          await userWorkspaceSettingsRepository.findByUserAndWorkspace(
            user.id,
            call.workspaceId,
          );
        const evalSettings = settings?.evaluationSettings as
          | { templateSlug?: string; customInstructions?: string }
          | null
          | undefined;
        if (evalSettings?.templateSlug) {
          templateSlug = evalSettings.templateSlug as EvaluationTemplateSlug;
          customInstructions = evalSettings.customInstructions ?? null;
          userHasTemplate = true;
        }
      }

      if (!userHasTemplate) {
        const defaultTemplate = await promptsRepository.findByKeyWithDefault(
          "evaluation_default_template",
          call.workspaceId,
          DEFAULT_TEMPLATE,
        );
        if (defaultTemplate) {
          templateSlug = defaultTemplate as EvaluationTemplateSlug;
        }
      }

      return getEvaluationPrompt(templateSlug, customInstructions);
    });

    const evaluation = await step.run("evaluate", async () => {
      return evaluateCallWithLlm(transcriptText, {
        evaluationPrompt,
      });
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
