import { createChatBot } from "@calls/ai";
import type { storage as StorageType } from "@calls/db";
import { z } from "zod";
import {
  adminProcedure,
  protectedProcedure,
  workspaceProcedure,
} from "../orpc";

async function generateRecommendations(
  callId: number,
  storage: typeof StorageType,
): Promise<{ recommendations: string[] }> {
  try {
    const call = await storage.getCall(callId);
    if (!call) {
      throw new Error(`Звонок с ID ${callId} не найден`);
    }

    const transcript = await storage.getTranscriptByCallId(callId);
    const evaluation = await storage.getEvaluation(callId);

    let transcriptText = transcript?.text ?? transcript?.raw_text ?? "";
    if (!transcriptText.trim()) {
      throw new Error(
        "Транскрипт звонка пуст — невозможно сформировать рекомендации",
      );
    }

    // Проверка длины транскрипта для предотвращения проблем с API
    if (transcriptText.length > 50000) {
      console.warn(
        `[recommendations] Transcript too long (${transcriptText.length} chars), truncating`,
      );
      transcriptText = transcriptText.substring(0, 50000) + "...";
    }

    const systemPrompt =
      (await storage.getPrompt("manager_recommendations")) ??
      `Ты эксперт по оценке качества телефонных переговоров. На основе транскрипта звонка и имеющейся оценки сформируй 3–5 конкретных рекомендаций для менеджера по улучшению качества общения с клиентом. Отвечай строго JSON-массивом строк на русском, например: ["Рекомендация 1", "Рекомендация 2"].`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY не задан — настрой переменную окружения для генерации рекомендаций",
      );
    }

    const contextParts: string[] = [];
    if (evaluation?.value_explanation)
      contextParts.push(`Оценка ценности: ${evaluation.value_explanation}`);
    if (evaluation?.manager_feedback)
      contextParts.push(`Обратная связь: ${evaluation.manager_feedback}`);

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

  // Fallback: split by newlines and bullet points
  const lines = trimmed
    .split(/\n+/)
    .map((s) => s.replace(/^[\s\-*\d.)]+\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.slice(0, 5); // Ограничиваем количество рекомендаций
  }

  // Последний fallback: возвращаем весь текст как одну рекомендацию
  const fallbackText =
    trimmed.length > 200 ? trimmed.substring(0, 200) + "..." : trimmed;
  return [fallbackText];
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

const listCallsSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(15),
  q: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  direction: z.string().optional(),
  manager: z.string().optional(),
  status: z.string().optional(),
  value: z.array(z.number()).optional(),
  operator: z.array(z.string()).optional(),
});

export const callsRouter = {
  list: workspaceProcedure
    .input(listCallsSchema)
    .handler(async ({ input, context }) => {
      const { storage, user, workspaceId } = context;
      const offset = (input.page - 1) * input.per_page;

      const dateFrom = input.date_from
        ? `${input.date_from}T00:00:00`
        : undefined;
      const dateTo = input.date_to ? `${input.date_to}T23:59:59` : undefined;

      const internalNumbers = getInternalNumbersForUser(user!, storage);
      const mobileNumbers = getMobileNumbersForUser(user!, storage);

      const callsWithTranscripts = await storage.getCallsWithTranscripts({
        workspaceId: workspaceId!,
        limit: input.per_page,
        offset,
        dateFrom,
        dateTo,
        internalNumbers,
        mobileNumbers,
        direction:
          input.direction === "incoming" || input.direction === "Входящий"
            ? "Входящий"
            : input.direction === "outgoing" || input.direction === "Исходящий"
              ? "Исходящий"
              : undefined,
        valueScores: input.value?.length ? input.value : undefined,
        operators: input.operator?.length ? input.operator : undefined,
        manager: input.manager || undefined,
        status: input.status || undefined,
        q: input.q?.trim() || undefined,
      });

      const totalItems = await storage.countCalls({
        workspaceId: workspaceId!,
        dateFrom,
        dateTo,
        internalNumbers,
        mobileNumbers,
        direction:
          input.direction === "incoming" || input.direction === "Входящий"
            ? "Входящий"
            : input.direction === "outgoing" || input.direction === "Исходящий"
              ? "Исходящий"
              : undefined,
        valueScores: input.value?.length ? input.value : undefined,
        operators: input.operator?.length ? input.operator : undefined,
        manager: input.manager || undefined,
        status: input.status || undefined,
        q: input.q?.trim() || undefined,
      });

      const totalPages = Math.ceil(totalItems / input.per_page) || 1;
      const metrics = await storage.calculateMetrics(workspaceId!);
      const managers = (await storage.getAllUsers()).filter(
        (u) => (u as Record<string, unknown>).internalExtensions,
      );

      return {
        calls: callsWithTranscripts,
        pagination: {
          page: input.page,
          total: totalItems,
          per_page: input.per_page,
          total_pages: totalPages,
          has_next: input.page < totalPages,
          has_prev: input.page > 1,
          next_num: input.page + 1,
          prev_num: input.page - 1,
          query: input.q ?? "",
          date_from: input.date_from ?? "",
          date_to: input.date_to ?? "",
          direction: input.direction ?? "all",
          status: input.status ?? "all",
          manager: input.manager ?? "",
          value: input.value ?? [],
          operator: input.operator ?? [],
        },
        metrics: {
          total_calls: totalItems,
          transcribed: metrics.transcribed,
          avg_duration: metrics.avg_duration,
          last_sync: metrics.last_sync,
        },
        managers,
      };
    }),

  get: workspaceProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input, context }) => {
      const call = await context.storage.getCall(input.call_id);
      if (!call) {
        throw new Error("Call not found");
      }
      if (call.workspaceId !== context.workspaceId) {
        throw new Error("Call not found");
      }
      const transcript = await context.storage.getTranscriptByCallId(
        input.call_id,
      );
      const evaluation = await context.storage.getEvaluation(input.call_id);
      const durationSeconds = call.duration ?? 0;
      return {
        call,
        transcript,
        evaluation,
        operator_name: call.name ?? null,
        duration_seconds: durationSeconds,
        duration_formatted: formatDuration(durationSeconds),
      };
    }),

  generateRecommendations: workspaceProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input, context }) => {
      const call = await context.storage.getCall(input.call_id);
      if (call && call.workspaceId !== context.workspaceId) {
        throw new Error("Call not found");
      }
      return generateRecommendations(input.call_id, context.storage);
    }),

  delete: adminProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input, context }) => {
      const call = await context.storage.getCall(input.call_id);
      if (!call) throw new Error("Call not found");
      if (!(await context.storage.deleteCall(input.call_id)))
        throw new Error("Failed to delete call");
      await context.storage.addActivityLog(
        "info",
        `Deleted call #${input.call_id}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: `Call #${input.call_id} deleted` };
    }),
};

function getInternalNumbersForUser(
  user: Record<string, unknown>,
  _storage: typeof import("@calls/db").storage,
): string[] | undefined {
  const nums = user.internalExtensions as string | undefined;
  if (!nums || String(nums).trim().toLowerCase() === "all") return undefined;
  const adminUsernames = ["admin@mango", "admin@gmail.com"];
  if (adminUsernames.includes((user.username as string) ?? ""))
    return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}

function getMobileNumbersForUser(
  user: Record<string, unknown>,
  _storage: typeof import("@calls/db").storage,
): string[] | undefined {
  const nums = user.mobilePhones as string | undefined;
  if (!nums?.trim()) return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}
