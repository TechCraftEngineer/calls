---
description: Правила работы с чатами и Wizard компонентами, включая архитектуру сообщений и состояние чатов
alwaysApply: false
inclusion: fileMatch
fileMatchPattern: "**/wizard-chat/**/*.{ts,tsx}"
---

# Правила работы с чатами и Wizard

## Архитектура чата

### Структура сообщений

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
  };
}

interface Conversation {
  id: string;
  messages: ChatMessage[];
  context: {
    gigDraft?: GigDraft;
    workspaceId: string;
    userId: string;
  };
  status: "active" | "completed" | "error";
}
```

### Состояние Wizard

```typescript
type WizardStep =
  | "welcome"
  | "title"
  | "description"
  | "budget"
  | "timeline"
  | "skills"
  | "deliverables"
  | "review";

interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  gigDraft: Partial<GigDraft>;
  isGenerating: boolean;
  errors: Record<string, string>;
}
```

## Обработка сообщений

### Валидация сообщений

```typescript
const messageSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  role: z.enum(["user", "assistant"]),
  conversationId: z.string().uuid()
});

// Фильтрация вредного контента
const sanitizeMessage = (content: string): string => {
  // Удалить потенциально опасные теги
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Удалить HTML теги
    .trim();
};
```

### Генерация ответов AI

```typescript
const generateAIResponse = async (
  messages: ChatMessage[],
  context: GigDraft
): Promise<ChatMessage> => {
  const prompt = buildPrompt(messages, context);

  try {
    const response = await ai.generate({
      prompt,
      maxTokens: 1000,
      temperature: 0.7,
      stopSequences: ["\n\n"]
    });

    return {
      id: generateId(),
      role: "assistant",
      content: response.content,
      timestamp: new Date(),
      metadata: {
        tokens: response.usage?.totalTokens,
        model: response.model,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('AI generation failed:', error);
    throw new Error('Не удалось сгенерировать ответ');
  }
};
```

## Управление состоянием

### Wizard логика

```typescript
const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: getNextStep(state.currentStep),
        completedSteps: [...state.completedSteps, state.currentStep]
      };

    case 'UPDATE_DRAFT':
      return {
        ...state,
        gigDraft: { ...state.gigDraft, ...action.payload },
        errors: validateStep(state.currentStep, { ...state.gigDraft, ...action.payload })
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.step]: action.message }
      };

    default:
      return state;
  }
};
```

### Валидация шагов

```typescript
const validateStep = (step: WizardStep, draft: Partial<GigDraft>) => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 'title':
      if (!draft.title?.trim()) {
        errors.title = 'Название обязательно';
      } else if (draft.title.length < 10) {
        errors.title = 'Название должно быть не менее 10 символов';
      }
      break;

    case 'budget':
      if (!draft.budgetMin || draft.budgetMin < 1000) {
        errors.budgetMin = 'Минимальный бюджет от 1000 ₽';
      }
      if (!draft.budgetMax || draft.budgetMax < draft.budgetMin) {
        errors.budgetMax = 'Максимальный бюджет должен быть больше минимального';
      }
      break;

    // ... другие валидации
  }

  return errors;
};
```

## UX/UI правила

### Индикаторы состояния

```typescript
// Показывать состояние генерации
const ChatInput = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="relative">
      <Textarea
        disabled={isGenerating}
        placeholder={isGenerating ? "Генерирую ответ..." : "Опишите ваш проект..."}
      />
      {isGenerating && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
};
```

### Быстрые ответы

```typescript
// Предлагать быстрые ответы для распространенных вопросов
const quickReplies = [
  "Расскажите подробнее о проекте",
  "Какой бюджет вы рассматриваете?",
  "Какие сроки выполнения?",
  "Какие навыки требуются?",
  "Что должно быть в результате?"
];
```

## Производительность

### Оптимизация рендеринга

```typescript
// Мемоизация сообщений
const ChatMessage = memo(({ message }: { message: ChatMessage }) => {
  return (
    <div className={cn(
      "flex gap-3 p-4",
      message.role === "user" ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg p-3",
        message.role === "user"
          ? "bg-primary text-primary-foreground"
          : "bg-muted"
      )}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
});
```

### Виртуализация длинных чатов

```typescript
// Для чатов с большим количеством сообщений
import { Virtuoso } from 'react-virtuoso';

const VirtualizedChat = ({ messages }: { messages: ChatMessage[] }) => {
  return (
    <Virtuoso
      data={messages}
      itemContent={(index, message) => (
        <ChatMessage key={message.id} message={message} />
      )}
      style={{ height: '400px' }}
      followOutput="smooth"
    />
  );
};
```

## Безопасность

### Фильтрация контента

```typescript
// Проверять контент на вредоносность
const validateContent = (content: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    // ... другие паттерны
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
};
```

### Rate limiting

```typescript
// Ограничение частоты отправки сообщений
const MESSAGE_RATE_LIMIT = 1000; // 1 сообщение в секунду
let lastMessageTime = 0;

const canSendMessage = (): boolean => {
  const now = Date.now();
  if (now - lastMessageTime < MESSAGE_RATE_LIMIT) {
    return false;
  }
  lastMessageTime = now;
  return true;
};
```