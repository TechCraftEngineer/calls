import { openai } from "@ai-sdk/openai";
import { env } from "@calls/config";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { z } from "zod";
import { generateWithAi } from "./generate";
import {
  type ChatBotConfig,
  type ChatBotResponse,
  ChatConversationHistorySchema,
  type ChatConversationMessage,
  ChatConversationMessageSchema,
  type ChatMessage,
} from "./types";

type ChatProvider = "openai" | "openrouter";

function normalizeConversationMessages(
  messages: ChatMessage[],
): ChatConversationMessage[] {
  const trimmedMessages = messages
    .map((msg) => {
      const baseContent = msg.content.trim();
      const context = msg.context?.trim();
      const mergedContent = context
        ? `${baseContent}\n\nContext: ${context}`
        : baseContent;

      return {
        role: msg.role,
        content: mergedContent.slice(0, 2000),
      };
    })
    .slice(-20);

  return ChatConversationHistorySchema.parse(trimmedMessages);
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const code = Reflect.get(error, "code");
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    code === "TIMEOUT" ||
    code === "ETIMEDOUT" ||
    error.message.toLowerCase().includes("timeout") ||
    error.message.toLowerCase().includes("timed out")
  );
}

function createTimeoutStreamError(cause: unknown): Error & { code: string } {
  const timeoutError = new Error(
    "Превышено время ожидания потоковой передачи ИИ",
    {
      cause: cause instanceof Error ? cause : undefined,
    },
  ) as Error & { code: string };
  timeoutError.name = "TimeoutError";
  timeoutError.code = "TIMEOUT";
  return timeoutError;
}

export function createChatBot(config: ChatBotConfig) {
  const validatedConfig = z
    .object({
      provider: z.enum(["openai", "openrouter"]).default("openai"),
      model: z.string(),
      apiKey: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().min(1).max(4000),
      systemPrompt: z.string().optional(),
    })
    .parse(config);

  const getProviderOrder = (primary: ChatProvider): ChatProvider[] =>
    primary === "openrouter"
      ? ["openrouter", "openai"]
      : ["openai", "openrouter"];

  const buildStreamingCandidates = () => {
    const rawFallbackModel = env.AI_MODEL?.trim();
    const fallbackModel =
      rawFallbackModel && rawFallbackModel !== validatedConfig.model
        ? rawFallbackModel
        : undefined;
    const models = [validatedConfig.model, fallbackModel].filter(
      (item): item is string => Boolean(item),
    );
    const providers = getProviderOrder(validatedConfig.provider);

    return providers.flatMap((provider) =>
      models.map((modelId) => ({ provider, modelId })),
    );
  };

  const getModelInstance = (provider: ChatProvider, modelId: string) =>
    provider === "openrouter" ? openrouter(modelId) : openai(modelId);

  return {
    async sendMessage(
      messages: ChatMessage[],
      options?: {
        userId?: string;
        sessionId?: string;
        tags?: string[];
      },
    ): Promise<ChatBotResponse> {
      const formattedMessages = normalizeConversationMessages(messages);

      if (validatedConfig.systemPrompt) {
        formattedMessages.unshift(
          ChatConversationMessageSchema.parse({
            role: "system",
            content: validatedConfig.systemPrompt.trim().slice(0, 2000),
          }),
        );
      }

      try {
        const response = await generateWithAi({
          provider: validatedConfig.provider,
          model: validatedConfig.model,
          messages: formattedMessages,
          temperature: validatedConfig.temperature,
          functionId: "chat-message",
          metadata: {
            ...(options?.userId && { userId: options.userId }),
            ...(options?.sessionId && { sessionId: options.sessionId }),
            ...(options?.tags && { tags: options.tags }),
            provider: validatedConfig.provider,
            model: validatedConfig.model,
          },
        });

        const result = {
          message: {
            id: Date.now().toString(),
            role: "assistant" as const,
            content: response.text,
            timestamp: new Date(),
          },
          usage: response.usage
            ? {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: response.usage.totalTokens || 0,
              }
            : undefined,
        };

        return result;
      } catch (error) {
        console.error("Chat bot error:", error);
        throw new Error("Не удалось сгенерировать ответ");
      }
    },

    async sendMessageStream(messages: ChatMessage[]) {
      const formattedMessages = normalizeConversationMessages(messages);

      if (validatedConfig.systemPrompt) {
        formattedMessages.unshift(
          ChatConversationMessageSchema.parse({
            role: "system",
            content: validatedConfig.systemPrompt.trim().slice(0, 2000),
          }),
        );
      }

      try {
        const candidates = buildStreamingCandidates();
        let lastError: unknown = null;

        for (const candidate of candidates) {
          try {
            const result = await streamText({
              model: getModelInstance(candidate.provider, candidate.modelId),
              messages: formattedMessages,
              temperature: validatedConfig.temperature,
            });

            return result.toTextStreamResponse();
          } catch (error) {
            lastError = error;
            console.error("Chat bot streaming attempt failed:", {
              provider: candidate.provider,
              model: candidate.modelId,
              error: error instanceof Error ? error.message : String(error),
            });

            if (isTimeoutError(error)) {
              throw createTimeoutStreamError(error);
            }
          }
        }

        throw (
          lastError ?? new Error("Нет доступных кандидатов стриминговой модели")
        );
      } catch (error) {
        console.error("Chat bot streaming error:", error);
        if (
          error instanceof Error &&
          (error.name === "TimeoutError" ||
            Reflect.get(error, "code") === "TIMEOUT")
        ) {
          throw error;
        }
        throw new Error("Не удалось сгенерировать потоковый ответ");
      }
    },
  };
}

export async function streamChatResponse(
  config: ChatBotConfig,
  messages: ChatMessage[],
) {
  const chatBot = createChatBot(config);
  return chatBot.sendMessageStream(messages);
}
