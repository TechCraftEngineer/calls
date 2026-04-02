# Архитектура: Разделение ответственности

## Принцип

**Python сервисы** - только свои задачи (ASR, diarization)  
**Inngest** - оркестрация, LLM, бизнес-логика

## Компоненты

### 1. GigaAM (Python)
**Ответственность:** Только ASR (распознавание речи)

**Что делает:**
- Принимает аудио
- Выполняет Full ASR (без диаризации)
- Выполняет Diarized ASR (по сегментам)
- Отправляет результаты в Inngest
- Возвращает ответ клиенту

**Что НЕ делает:**
- ❌ LLM коррекция
- ❌ Сохранение в БД
- ❌ Бизнес-логика
- ❌ Оркестрация

**API:**
```
POST /api/transcribe
  → Full ASR
  → Diarization (через speaker-embeddings)
  → Diarized ASR
  → Send to Inngest
  ← Response (diarized segments)
```

### 2. Speaker Embeddings (Python)
**Ответственность:** Только diarization

**Что делает:**
- Принимает аудио
- Выполняет speaker diarization (pyannote)
- Возвращает сегменты по спикерам

**Что НЕ делает:**
- ❌ ASR
- ❌ LLM
- ❌ Сохранение

**API:**
```
POST /api/diarize
  → Pyannote diarization
  ← Segments with speakers
```

### 3. Inngest (TypeScript)
**Ответственность:** Оркестрация и LLM

**Что делает:**
- Получает результаты от GigaAM
- Выполняет LLM коррекцию
- Сохраняет в БД
- Отправляет webhook
- Управляет workflow

**Функции:**
- `transcription-completed` - обработка результатов ASR
- `transcribe-call` - полный workflow транскрипции
- `evaluate-call` - оценка звонка
- и др.

## Поток данных

### Стандартный режим (без LLM)

```
Client
  ↓ POST /api/transcribe
GigaAM
  ├─ Full ASR
  ├─ Diarization (→ speaker-embeddings)
  └─ Diarized ASR
  ↓ Response
Client
```

### Dual ASR + LLM режим

```
Client
  ↓ POST /api/transcribe
GigaAM
  ├─ Full ASR
  ├─ Diarization (→ speaker-embeddings)
  ├─ Diarized ASR
  ├─ Send to Inngest (async)
  └─ Response (diarized segments)
  ↓
Client (получает результат сразу)

Inngest (асинхронно)
  ├─ Receive event
  ├─ LLM correction
  ├─ Save to DB
  └─ Webhook (optional)
```

## Настройки

### GigaAM (.env)
```bash
# Только флаг и Inngest connection
ENABLE_DUAL_ASR_LLM_CORRECTION=true
INNGEST_API_URL=http://localhost:3001
INNGEST_EVENT_KEY=

# НЕТ LLM настроек!
```

### Inngest (.env)
```bash
# AI Provider (использует @calls/config)
AI_PROVIDER=openrouter
AI_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=sk-or-v1-...
```

## Преимущества

### 1. Чистая архитектура
- Каждый сервис делает одну вещь хорошо
- Легко тестировать
- Легко масштабировать

### 2. Независимость
- Python сервисы не знают про LLM
- Можно менять LLM без изменения Python
- Можно добавлять новые шаги в Inngest

### 3. Безопасность
- LLM ключи только в Inngest
- Python сервисы не имеют доступа к секретам
- Централизованное управление

### 4. Масштабируемость
- Python сервисы масштабируются независимо
- Inngest автоматически масштабирует LLM задачи
- Разные ресурсы для разных задач

### 5. Мониторинг
- Python: логи ASR/diarization
- Inngest: Dashboard для LLM и workflow
- Разделённые метрики

## Примеры

### Добавление нового шага

Хотим добавить sentiment analysis после LLM коррекции:

**Неправильно (в Python):**
```python
# ❌ НЕ ТАК
def pipeline():
    segments = asr()
    corrected = llm_correct(segments)
    sentiment = analyze_sentiment(corrected)  # Новая логика в Python
    return sentiment
```

**Правильно (в Inngest):**
```typescript
// ✅ ТАК
export const transcriptionCompletedFn = inngest.createFunction(
  async ({ event, step }) => {
    const corrected = await step.run("llm/correct", ...);
    
    // Новый шаг - только в Inngest
    const sentiment = await step.run("analyze/sentiment", async () => {
      return await analyzeSentiment(corrected);
    });
    
    return { corrected, sentiment };
  }
);
```

### Изменение LLM модели

**Неправильно:**
```bash
# ❌ Менять в каждом Python сервисе
services/giga-am/.env: LLM_MODEL=gpt-4
services/other/.env: LLM_MODEL=gpt-4
```

**Правильно:**
```bash
# ✅ Менять только в Inngest
packages/jobs/.env: AI_MODEL=gpt-4o
```

## Миграция существующего кода

Если у вас есть LLM логика в Python:

1. **Создайте Inngest функцию**
   ```typescript
   export const myLlmTaskFn = inngest.createFunction(...)
   ```

2. **Отправьте event из Python**
   ```python
   inngest_client.send_event("my/task.requested", data)
   ```

3. **Удалите LLM код из Python**
   ```python
   # Удалить:
   # - LLM API calls
   # - LLM настройки
   # - Промпты
   ```

## Troubleshooting

### "LLM API not configured"

Проверьте `.env` в `packages/jobs`, НЕ в `services/giga-am`!

### Python сервис пытается вызвать LLM

Удалите все LLM импорты и настройки из Python кода.

### Inngest не получает events

Проверьте:
1. `INNGEST_API_URL` в GigaAM
2. Inngest запущен
3. Функция зарегистрирована

## Дальнейшее развитие

Следующие шаги для полной оркестрации через Inngest:

1. ✅ LLM коррекция → Inngest
2. ⏳ Сохранение в БД → Inngest
3. ⏳ Webhook отправка → Inngest
4. ⏳ Evaluation → Inngest
5. ⏳ Reports → Inngest

Цель: Python сервисы только для ML задач, всё остальное в Inngest.
