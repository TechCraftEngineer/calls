---
description: Правила интеграции и работы с AI сервисами, включая безопасность, валидацию и обработку ошибок
alwaysApply: false
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx}"
---

# Правила интеграции с AI

## Общие принципы

- **Безопасность**: Всегда валидировать входные данные перед отправкой в AI
- **Лимиты**: Ограничивать длину сообщений и количество токенов
- **Обработка ошибок**: Правильно обрабатывать таймауты, сетевые ошибки и отказы AI
- **Логирование**: Логировать все взаимодействия с AI для отладки

## Схемы валидации

### Входные данные AI

```typescript
// Всегда использовать Zod для валидации
const aiInputSchema = z.object({
  message: z.string().min(1).max(2000), // Ограничение длины
  context: z.object({}).optional(), // Контекст для AI
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).max(20).optional() // Ограничение истории
});
```

### Ответы AI

```typescript
// Строгая валидация ответов AI
const aiResponseSchema = z.object({
  content: z.string(),
  metadata: z.object({
    tokens: z.number(),
    model: z.string(),
    finishReason: z.enum(["stop", "length", "error"])
  }).optional()
});
```

## Обработка ошибок

```typescript
// Правильная обработка ошибок AI
try {
  const response = await ai.generate(request);
  return aiResponseSchema.parse(response);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    throw new TRPCError({
      code: 'TIMEOUT',
      message: 'AI не ответил вовремя'
    });
  }
  // Логировать для отладки
  console.error('AI Error:', error);
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ошибка при работе с AI'
  });
}
```

## Производительность

- **Кэширование**: Кэшировать частые запросы к AI
- **Дебансинг**: Предотвращать спам-запросы
- **Стримминг**: Использовать стриминг для длинных ответов

## Безопасность

- **Фильтрация**: Фильтровать потенциально вредный контент
- **Rate limiting**: Ограничивать частоту запросов
- **Аудит**: Логировать все взаимодействия для аудита
