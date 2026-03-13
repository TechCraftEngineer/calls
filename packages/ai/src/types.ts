import { z } from 'zod';

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatBotConfigSchema = z.object({
  model: z.string().default('gpt-3.5-turbo'),
  apiKey: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
  systemPrompt: z.string().optional(),
});

export type ChatBotConfig = z.infer<typeof ChatBotConfigSchema>;

export interface ChatBotResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
