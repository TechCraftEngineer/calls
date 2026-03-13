import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText, streamText } from "ai";
import { z } from "zod";
import type { ChatBotConfig, ChatBotResponse, ChatMessage } from "./types";

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

  const model =
    validatedConfig.provider === "openrouter"
      ? openrouter(validatedConfig.model)
      : openai(validatedConfig.model);

  return {
    async sendMessage(
      messages: ChatMessage[],
      options?: {
        userId?: string;
        sessionId?: string;
        tags?: string[];
      },
    ): Promise<ChatBotResponse> {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      if (validatedConfig.systemPrompt) {
        formattedMessages.unshift({
          role: "system",
          content: validatedConfig.systemPrompt,
        });
      }

      try {
        const response = await generateText({
          model,
          messages: formattedMessages,
          temperature: validatedConfig.temperature,
          experimental_telemetry: {
            isEnabled: true,
            functionId: "chat-message",
            metadata: {
              ...(options?.userId && { userId: options.userId }),
              ...(options?.sessionId && { sessionId: options.sessionId }),
              ...(options?.tags && { tags: options.tags }),
              provider: validatedConfig.provider,
              model: validatedConfig.model,
            },
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
        throw new Error("Failed to generate response");
      }
    },

    async sendMessageStream(messages: ChatMessage[]) {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      if (validatedConfig.systemPrompt) {
        formattedMessages.unshift({
          role: "system",
          content: validatedConfig.systemPrompt,
        });
      }

      try {
        const result = await streamText({
          model,
          messages: formattedMessages,
          temperature: validatedConfig.temperature,
        });

        return result.toTextStreamResponse();
      } catch (error) {
        console.error("Chat bot streaming error:", error);
        throw new Error("Failed to generate streaming response");
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
