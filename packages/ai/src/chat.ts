import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText, streamText } from "ai";
import { z } from "zod";
import { createTrace, logChatEvent } from "./tracing";
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
    async sendMessage(messages: ChatMessage[]): Promise<ChatBotResponse> {
      const trace = createTrace("chat-message");
      const traceId = trace?.id || "no-trace";

      logChatEvent(traceId, "chat-start", {
        messageCount: messages.length,
        model: validatedConfig.model,
        provider: validatedConfig.provider,
      });

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

        logChatEvent(traceId, "chat-success", {
          responseLength: response.text.length,
          usage: result.usage,
        });

        trace?.update({
          output: result,
        });

        return result;
      } catch (error) {
        console.error("Chat bot error:", error);

        logChatEvent(traceId, "chat-error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });

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
