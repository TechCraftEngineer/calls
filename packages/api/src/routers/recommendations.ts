import { createChatBot } from "@calls/ai";
import type { storage as StorageType } from "@calls/db";
import { storage } from "@calls/db";

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

  if (lines.length > 0) {
    return lines.slice(0, 5);
  }

  const fallbackText =
    trimmed.length > 200 ? trimmed.substring(0, 200) + "..." : trimmed;
  return [fallbackText];
}

export async function generateRecommendations(
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
