import { createChatBot } from "@calls/ai";
import type { Call, callsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

const DEFAULT_RECOMMENDATIONS_PROMPT = `Ты эксперт по оценке качества телефонных переговоров. На основе транскрипта звонка и имеющейся оценки сформируй 3–5 конкретных рекомендаций для менеджера по улучшению качества общения с клиентом. Отвечай строго JSON-массивом строк на русском, например: ["Рекомендация 1", "Рекомендация 2"].`;

const INJECTION_PATTERNS = [
  /\bignore\s+(previous|prior|all)\s+(instructions?|prompts?)\b/i,
  /\bforget\s+(everything|all|your)\b/i,
  /\bdo\s+not\s+follow\s+(instructions?|prompts?)\b/i,
  /\bsystem\s+prompt\b/i,
  /\binstructions?\s*:\s*\w/i,
  /\byou\s+are\s+[\w\s]+\s+now\b/i,
  /\bdisregard\s+(previous|prior)\b/i,
  /\boverride\s+(instructions?|prompts?)\b/i,
  /\bnew\s+instructions?\s*:\s*\w/i,
];

function sanitizeCompanyContext(s: string): string {
  const trimmed = s.trim();
  let out = "";
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code > 31 && code !== 127) out += trimmed[i];
  }
  const lines = out.split(/\n/).filter((line) => {
    const l = line.trim();
    if (!l) return true;
    if (/^>>\s*\w/.test(l) || /^#\s*instruction\b/i.test(l)) return false;
    if (/^(ignore|forget|disregard|override|you\s+are)\b/i.test(l))
      return false;
    return true;
  });
  const result = lines.join("\n").trim();
  return result.length > 2000 ? result.slice(0, 2000) : result;
}

function hasInjectionPatterns(s: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(s));
}

const companyContextSchema = z
  .string()
  .transform(sanitizeCompanyContext)
  .pipe(
    z
      .string()
      .max(2000)
      .refine((s) => !hasInjectionPatterns(s), {
        message: "Контекст содержит недопустимое содержимое",
      }),
  );

function parseRecommendationsJson(text: string): string[] {
  if (!text || typeof text !== "string") {
    console.warn("[recommendations] Empty or invalid text received");
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
    console.warn(
      "[recommendations] Failed to parse JSON, trying fallback parsing:",
      error,
    );
  }

  const lines = trimmed
    .split(/\n+/)
    .map((s) => s.replace(/^[\s\-*\d.)]+\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) return lines.slice(0, 5);

  const fallbackText =
    trimmed.length > 200 ? `${trimmed.substring(0, 200)}...` : trimmed;
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

    let transcriptText = transcript?.text ?? transcript?.rawText ?? "";
    if (!transcriptText.trim()) {
      throw new Error(
        "Транскрипт звонка пуст — невозможно сформировать рекомендации",
      );
    }

    if (transcriptText.length > 50000) {
      console.warn(
        `[recommendations] Transcript too long (${transcriptText.length} chars), truncating`,
      );
      transcriptText = `${transcriptText.substring(0, 50000)}...`;
    }

    const companyBlock = companyContext?.trim()
      ? `КОНТЕКСТ КОМПАНИИ:\n${companyContext.trim()}\n\nУчитывай специфику бизнеса при формировании рекомендаций.\n\n`
      : "";
    const systemPrompt = companyBlock + DEFAULT_RECOMMENDATIONS_PROMPT;

    const apiKey = process.env.OPENROUTER_API_KEY;
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
${transcriptText}
---
${contextParts.length ? `Контекст оценки:\n${contextParts.join("\n")}` : ""}

Сформируй рекомендации в формате JSON-массива строк.`;

    const chatBot = createChatBot({
      provider: "openrouter",
      model: process.env.AI_RECOMMENDATIONS_MODEL ?? "openai/gpt-4o-mini",
      apiKey,
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt,
    });

    console.log(
      `[recommendations] Generating recommendations for call ${callId}`,
    );
    const response = await chatBot.sendMessage([
      { id: "1", role: "user", content: userMessage },
    ]);

    const text = response.message.content.trim();
    const parsed = parseRecommendationsJson(text);

    if (parsed.length === 0) {
      console.warn(
        `[recommendations] No valid recommendations generated for call ${callId}`,
      );
      return {
        recommendations: [
          "Не удалось сформировать рекомендации. Попробуйте позже.",
        ],
      };
    }

    console.log(
      `[recommendations] Generated ${parsed.length} recommendations for call ${callId}`,
    );
    return { recommendations: parsed };
  } catch (error) {
    console.error(
      `[recommendations] Error generating recommendations for call ${callId}:`,
      error,
    );
    if (error instanceof Error) {
      throw new Error(
        `Не удалось сгенерировать рекомендации: ${error.message}`,
      );
    }
    throw new Error("Не удалось сгенерировать рекомендации. Попробуйте позже.");
  }
}

export const generateRecommendationsProcedure = workspaceProcedure
  .input(z.object({ call_id: z.string() }))
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

    const workspace = await context.workspacesService.getById(
      context.workspaceId,
    );
    if (!workspace) {
      throw new ORPCError("NOT_FOUND", {
        message: "Рабочая область не найдена",
      });
    }

    let companyContext: string | undefined;
    try {
      companyContext =
        companyContextSchema.parse(workspace.description ?? "") || undefined;
    } catch {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Описание рабочей области содержит недопустимое содержимое. Проверьте и удалите подозрительные инструкции.",
      });
    }

    return generateRecommendations(
      call,
      context.callsService,
      context.workspaceId,
      companyContext,
    );
  });
