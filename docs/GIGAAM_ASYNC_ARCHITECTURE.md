# Асинхронная архитектура GigaAM

## Проблема

Ранее Inngest ждал синхронного ответа от giga-am сервиса до 15 минут. Это было ненадежно:
- Сеть могла прерваться
- Inngest worker мог упасть
- Таймауты HTTP соединений

## Решение

Реализована асинхронная архитектура с двумя режимами работы:

### Режим 1: Inngest Callback (рекомендуется)

GigaAM сервис отправляет событие в Inngest когда транскрипция завершена.

**Поток:**
1. Inngest вызывает `/api/transcribe-async` → получает `task_id` сразу
2. GigaAM обрабатывает аудио в фоне
3. GigaAM отправляет событие `giga-am/transcription.completed` в Inngest
4. Inngest функция `gigaAmCompletedFn` обрабатывает результат

**Настройка:**
```bash
# В .env giga-am сервиса
INNGEST_API_URL=http://localhost:3001
INNGEST_EVENT_KEY=your-event-key
```

**Inngest функция:**
```typescript
import { gigaAmCompletedFn } from "@calls/jobs";

// Функция автоматически регистрируется при импорте
// Слушает событие giga-am/transcription.completed
```

### Режим 2: Polling (fallback)

Если Inngest callback не настроен (нет `INNGEST_EVENT_KEY`), используется polling.

**Поток:**
1. Inngest вызывает `/api/transcribe-async` → получает `task_id`
2. Inngest опрашивает `/api/status/{task_id}` каждые 30 сек
3. Максимум 60 попыток (30 минут)
4. Когда статус `completed` - продолжаем pipeline

**Автоматическое переключение:**
```typescript
import { processAudioWithGigaAmAuto } from "./gigaam/client";

// Автоматически выбирает режим:
// - Если INNGEST_EVENT_KEY настроен → callback режим
// - Иначе → polling режим
const result = await processAudioWithGigaAmAuto(audioBuffer, filename);
```

## Новые API эндпоинты

### POST /api/transcribe-async

Запускает асинхронную транскрипцию.

**Request:**
```json
{
  "file": <binary audio>,
  "filename": "audio.wav"
}
```

**Response (202 Accepted):**
```json
{
  "task_id": "uuid",
  "status": "pending",
  "message": "Task created and processing in background"
}
```

### GET /api/status/{task_id}

Проверяет статус задачи.

**Response:**
```json
{
  "task_id": "uuid",
  "filename": "audio.wav",
  "status": "completed",  // pending | processing | completed | failed
  "result": { ... },      // только если status == completed
  "error": "...",         // только если status == failed
  "created_at": "2024-01-01T00:00:00",
  "started_at": "2024-01-01T00:00:05",
  "completed_at": "2024-01-01T00:05:30",
  "processing_time_seconds": 325
}
```

### GET /api/tasks/stats

Статистика по задачам.

**Response:**
```json
{
  "total": 100,
  "pending": 5,
  "processing": 3,
  "completed": 90,
  "failed": 2
}
```

## Использование в коде

### Автоматический выбор режима (рекомендуется)

```typescript
import { processAudioWithGigaAmAuto } from "./gigaam/client";

// Автоматически использует callback если настроен INNGEST_EVENT_KEY
// Иначе использует polling
const result = await processAudioWithGigaAmAuto(audioBuffer, filename);
```

### Принудительный polling

```typescript
import { startAsyncTranscription } from "./gigaam/client";
import { waitForAsyncTranscription } from "./gigaam/async-client";

// Запуск асинхронной задачи
const { taskId } = await startAsyncTranscription(audioBuffer, filename);

// Ожидание завершения через polling
const result = await waitForAsyncTranscription(taskId);
```

### Проверка доступности callback режима

```typescript
import { isCallbackModeAvailable } from "./gigaam/async-client";

if (isCallbackModeAvailable()) {
  console.log("Callback режим доступен");
} else {
  console.log("Используется polling режим");
}
```

## Inngest Callback Handler

Реализована функция `gigaAmCompletedFn` которая:

1. Слушает событие `giga-am/transcription.completed`
2. Получает результат транскрипции из события
3. Конвертирует `DiarizedTranscriptionResult` в `AsrResult`
4. Возвращает результат для продолжения pipeline

**Файл:** `packages/jobs/src/inngest/functions/transcribe-call/gigaam/callback-handler.ts`

## Преимущества

1. **Надежность**: Сеть может прерваться без потери прогресса
2. **Масштабируемость**: GigaAM может обрабатывать множество задач параллельно
3. **Мониторинг**: Можно отслеживать статус задач в реальном времени
4. **Гибкость**: Два режима работы (callback/polling) с автоматическим переключением
5. **Мгновенный callback**: Inngest получает результат сразу как только готов

## Ограничения

- **In-memory хранилище**: Задачи теряются при перезапуске giga-am сервиса
  - Решение: добавить Redis для персистентности
- **Максимальное время**: 30 минут для polling режима
  - Решение: увеличить MAX_POLL_ATTEMPTS

## Будущие улучшения

1. **Redis для персистентности**: Хранить задачи в Redis вместо памяти
2. **Webhook поддержка**: Отправлять результаты на любой URL
3. **Приоритеты**: Высокий/низкий приоритет задач
4. **Retry логика**: Автоматический retry при ошибках
5. **Очередь**: Ограничение количества одновременно обрабатываемых задач
