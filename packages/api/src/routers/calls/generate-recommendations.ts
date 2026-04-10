import { createChatBot } from "@calls/ai";
import { createLogger } from "@calls/api";
import {
  AI_MODEL,
  AI_MODEL_PREMIUM,
  AI_RECOMMENDATIONS_MODEL,
  OPENROUTER_API_KEY,
} from "@calls/config";
import type { Call, callsService } from "@calls/db";
import {
  buildCompanyContext,
  companyContextSchema,
  replaceSpeakersWithRoles,
} from "@calls/shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

const logger = createLogger("generate-recommendations");

const DEFAULT_RECOMMENDATIONS_MODEL =
  AI_RECOMMENDATIONS_MODEL ?? AI_MODEL_PREMIUM ?? AI_MODEL ?? "anthropic/claude-sonnet-4.6";

const DEFAULT_RECOMMENDATIONS_PROMPT = `Ты эксперт по оценке качества телефонных переговоров. На основе транскрипта звонка и имеющейся оценки сформируй 3–5 конкретных рекомендаций для менеджера по улучшению качества общения с клиентом. Отвечай строго JSON-массивом строк на русском, например: ["Рекомендация 1", "Рекомендация 2"].`;

function parseRecommendationsJson(text: string): string[] {
  if (!text || typeof text !== "string") {
    logger.warn("Empty or invalid text received");
    return [];
  }

  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    const arr = JSON.parse(trimmed);
    if (Array.isArray(arr)) {
      const validRecommendations = arr.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      );
      if (validRecommendations.length > 0) {
        return validRecommendations.map((rec) => rec.trim());
      }
    }
  } catch (error) {
    logger.warn("Failed to parse JSON, trying fallback parsing", { error });
  }

  const lines = trimmed
    .split(/\n+/)
    .map((s) => s.replace(/^[\s\-*\d.)]+\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) return lines.slice(0, 5);

  const fallbackText = trimmed.length > 200 ? `${trimmed.substring(0, 200)}...` : trimmed;
  return [fallbackText];
}

export async function generateRecommendations(
  call: Call,
  calls: typeof callsService,
  _workspaceId: string,
  companyContext?: string | null,
): Promise<{ recommendations: string[] }> {
  const callId = call.id;
  try {
    const transcript = await calls.getTranscriptByCallId(callId);
    const evaluation = await calls.getEvaluation(callId);

    // Извлекаем маппинг спикеров из метаданных и заменяем SPEAKER_XX на роли
    const speakerMapping = (transcript?.metadata?.mapping as Record<string, "operator" | "client">) ?? {};
    const rawTranscriptText = transcript?.text ?? transcript?.rawText ?? "";
    const transcriptText = replaceSpeakersWithRoles(rawTranscriptText, speakerMapping);

    if (!transcriptText.trim()) {
      throw new Error("Транскрипт звонка пуст — невозможно сформировать рекомендации");
    }

    // Обрезаем текст если слишком длинный
    const finalTranscriptText = transcriptText.length > 50000
      ? `${transcriptText.substring(0, 50000)}...`
      : transcriptText;

    if (transcriptText.length > 50000) {
      logger.warn("Transcript too long, truncating", {
        callId,
        workspaceId: _workspaceId,
        length: transcriptText.length,
      });
    }

    const companyBlock = companyContext?.trim()
      ? `${companyContext.trim()}\n\nУчитывай специфику бизнеса при формировании рекомендаций.\n\n`
      : "";
    const systemPrompt = companyBlock + DEFAULT_RECOMMENDATIONS_PROMPT;

    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY не задан — настрой переменную окружения для генерации рекомендаций",
      );
    }

    const contextParts: string[] = [];
    if (evaluation?.valueExplanation)
      contextParts.push(`Оценка ценности: ${evaluation.valueExplanation}`);
    if (evaluation?.managerFeedback)
      contextParts.push(`Обратная связь: ${evaluation.managerFeedback}`);

    const userMessage = `Транскрипт звонка:
---
${finalTranscriptText}
---
${contextParts.length ? `Контекст оценки:\n${contextParts.join("\n")}` : ""}

Сформируй рекомендации в формате JSON-массива строк.`;

    const chatBot = createChatBot({
      provider: "openrouter",
      model: DEFAULT_RECOMMENDATIONS_MODEL,
      apiKey,
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt,
    });

    const model = DEFAULT_RECOMMENDATIONS_MODEL;
    logger.info("AI recommendations request", {
      callId,
      workspaceId: _workspaceId,
      model,
      timestamp: new Date().toISOString(),
      event: "ai.request",
    });
    const response = await chatBot.sendMessage([{ id: "1", role: "user", content: userMessage }]);

    const text = response.message.content.trim();
    const parsed = parseRecommendationsJson(text);

    if (parsed.length === 0) {
      logger.warn("No valid recommendations generated", {
        callId,
        workspaceId: _workspaceId,
        model,
      });
      return {
        recommendations: ["Не удалось сформировать рекомендации. Попробуйте позже."],
      };
    }

    logger.info("AI recommendations response", {
      callId,
      workspaceId: _workspaceId,
      model,
      timestamp: new Date().toISOString(),
      event: "ai.response",
      recommendationsCount: parsed.length,
    });
    return { recommendations: parsed };
  } catch (error) {
    logger.error("AI recommendations error", {
      callId,
      workspaceId: _workspaceId,
      model: DEFAULT_RECOMMENDATIONS_MODEL,
      timestamp: new Date().toISOString(),
      event: "ai.error",
      error,
    });
    if (error instanceof Error) {
      throw new Error(`Не удалось сгенерировать рекомендации: ${error.message}`);
    }
    throw new Error("Не удалось сгенерировать рекомендации. Попробуйте позже.");
  }
}

const uuidV7Schema = z
  .string()
  .uuid()
  .refine((uuid) => uuid.split("-")[2]?.startsWith("7"), {
    message: "Требуется UUID v7",
  });
const uuidV7WithPrefixSchema = z
  .string()
  .regex(/^ws_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Неверный формат ID звонка с префиксом",
  });
const callIdSchema = z.union([uuidV7Schema, uuidV7WithPrefixSchema]);

export const generateRecommendationsProcedure = workspaceAdminProcedure
  .input(z.object({ call_id: callIdSchema }))
  .handler(async ({ input, context }) => {
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const call = await context.callsService.getCall(input.call_id);
    if (!call) {
      throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
    }
    if (call.workspaceId !== context.workspaceId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому звонку",
      });
    }

    const workspace = await context.workspacesService.getById(context.workspaceId);
    if (!workspace) {
      throw new ORPCError("NOT_FOUND", {
        message: "Рабочая область не найдена",
      });
    }

    let companyContext: string | undefined;
    try {
      const rawContext = buildCompanyContext(workspace);
      if (rawContext) {
        companyContext = companyContextSchema.parse(rawContext);
      }
    } catch (error) {
      logger.error("Company context validation failed", {
        workspaceId: context.workspaceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Описание рабочей области содержит недопустимое содержимое. Проверьте и удалите подозрительные инструкции.",
      });
    }

    return generateRecommendations(call, context.callsService, context.workspaceId, companyContext);
  });
