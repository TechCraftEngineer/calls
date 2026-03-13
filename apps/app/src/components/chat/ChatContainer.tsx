'use client';

import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { createChatBot, type ChatMessage, type ChatBotConfig } from '@calls/ai';

interface ChatContainerProps {
  config: ChatBotConfig;
  systemPrompt?: string;
}

export function ChatContainer({ config, systemPrompt }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const chatBot = createChatBot({
        ...config,
        systemPrompt,
      });

      const response = await chatBot.sendMessage([...messages, userMessage]);
      setMessages((prev) => [...prev, response.message]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatInterface
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
    />
  );
}
