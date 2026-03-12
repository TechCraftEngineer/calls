/**
 * API for AI chat: general and RAG over call transcripts.
 */

import { restPost } from './api';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatResponse = {
  content: string;
};

export async function sendChatMessage(
  messages: ChatMessage[],
  contextMode: 'general' | 'calls',
  startDate?: string,
  endDate?: string
): Promise<string> {
  const data = await restPost<ChatResponse>('/ai/chat', {
    messages,
    context_mode: contextMode,
    start_date: contextMode === 'calls' ? startDate : undefined,
    end_date: contextMode === 'calls' ? endDate : undefined,
  });
  return data.content;
}
