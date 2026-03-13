import { ChatContainer } from '@/components/chat/ChatContainer';
import { env } from '@calls/config';

export default function ChatPage() {
  const config = {
    model: env.AI_MODEL,
    apiKey: env.OPENAI_API_KEY || '',
    temperature: env.AI_TEMPERATURE,
    maxTokens: env.AI_MAX_TOKENS,
  };

  const systemPrompt = `Ты - полезный ассистент для приложения Calls. Помогай пользователям с их вопросами о приложении, звонках и настройках. Отвечай дружелюбно и профессионально на русском языке.`;

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Чат с ассистентом</h1>
        <div className="h-[600px]">
          <ChatContainer config={config} systemPrompt={systemPrompt} />
        </div>
      </div>
    </div>
  );
}
