/**
 * Inngest функция: оценка звонка по транскрипту.
 * Запускает LLM-анализ и сохраняет оценку (value_score, manager_score и т.д.).
 * Использует шаблон оценки пользователя (по internal_number) или workspace default.
 */

import {
  callsService,
  usersRepository,
  userWorkspaceSettingsRepository,
  workspaceSettingsRepository,
  workspacesService,
} from "@calls/db";
import { evaluateCallWithLlm, resolveEvaluationPrompt } from "../../evaluation";
import { createLogger } from "../../logger";
import { evaluateRequested, inngest } from "../client";

const logger = createLogger("evaluate-call");

function buildCompanyContext(workspace: {
  name?: string | null;
  description?: string | null;
}): string | undefined {
  const parts: string[] = [];
  const companyName = workspace.name?.trim();
  const companyDescription = workspace.description?.trim();

  if (companyName) {
    parts.push(`Название компании: ${companyName}`);
  }
  if (companyDescription) {
    parts.push(`Описание компании: ${companyDescription}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

const DEFAULT_TEMPLATE = "general";

export const evaluateCallFn = inngest.createFunction(
  {
    id: "evaluate-call",
    name: "Оценка звонка (LLM анализ транскрипта)",
    retries: 2,
    concurrency: {
      limit: 5,
      key: "event.data.callId",
    },
    triggers: [evaluateRequested],
  },
  async ({ event, step }) => {
    const { callId } = event.data;
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

    const transcriptText = transcript?.text?.trim() ?? transcript?.rawText?.trim() ?? "";
    if (!transcriptText) {
      logger.warn("Транскрипт пуст — пропускаем оценку", { callId });
      return { callId, skipped: true, reason: "empty_transcript" };
    }

    const evaluationPrompt = await step.run("resolve-template", async () => {
      let templateSlug: string = DEFAULT_TEMPLATE;
      let customInstructions: string | null = null;
      let userHasTemplate = false;

      const user = await usersRepository.findUserByInternalNumber(
        call.workspaceId,
        call.internalNumber,
      );

      if (user) {
        const settings = await userWorkspaceSettingsRepository.findByUserAndWorkspace(
          user.id,
          call.workspaceId,
        );
        const evalSettings = settings?.evaluationSettings as
          | { templateSlug?: string; customInstructions?: string }
          | null
          | undefined;
        if (evalSettings?.templateSlug) {
          templateSlug = evalSettings.templateSlug;
          customInstructions = evalSettings.customInstructions ?? null;
          userHasTemplate = true;
        }
      }

      if (!userHasTemplate) {
        const defaultTemplate = await workspaceSettingsRepository.findByKeyWithDefault(
          "evaluation_default_template",
          call.workspaceId,
          DEFAULT_TEMPLATE,
        );
        if (defaultTemplate) {
          templateSlug = defaultTemplate;
        }
      }

      return resolveEvaluationPrompt(call.workspaceId, templateSlug, customInstructions);
    });

    const workspace = await step.run("get-workspace", async () => {
      const ws = await workspacesService.getById(call.workspaceId);
      if (!ws) {
        logger.warn("Workspace not found for call evaluation", {
          workspaceId: call.workspaceId,
          callId,
        });
        throw new Error(`Workspace not found: ${call.workspaceId}`);
      }
      return ws;
    });

    const evaluation = await step.run("evaluate", async () => {
      return evaluateCallWithLlm(transcriptText, {
        evaluationPrompt,
        companyContext: buildCompanyContext(workspace),
      });
    });

    await step.run("save-evaluation", async () => {
      await callsService.addEvaluation({
        callId,
        isQualityAnalyzable: evaluation.isQualityAnalyzable,
        notAnalyzableReason: evaluation.notAnalyzableReason,
        valueScore: evaluation.valueScore,
        valueExplanation: evaluation.valueExplanation,
        managerScore: evaluation.managerScore,
        managerFeedback: evaluation.managerFeedback,
      });
      logger.info("Оценка сохранена", {
        callId,
        isQualityAnalyzable: evaluation.isQualityAnalyzable,
        notAnalyzableReason: evaluation.notAnalyzableReason,
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
