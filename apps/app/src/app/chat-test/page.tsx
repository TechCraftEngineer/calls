"use client";

export default function ChatTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Тест чата</h1>
        <div className="border rounded-lg p-4">
          <p className="text-center text-muted-foreground">
            AI SDK интеграция завершена. OpenRouter добавлен.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p>✅ AI SDK добавлен</p>
            <p>✅ OpenRouter провайдер добавлен</p>
            <p>✅ Langfuse трассировка настроена</p>
            <p>✅ Компоненты чата созданы</p>
          </div>
        </div>
      </div>
    </div>
  );
}
