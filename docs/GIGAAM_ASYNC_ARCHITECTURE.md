# Асинхронная архитектура GigaAM

## Проблема

Ранее Inngest ждал синхронного ответа от giga-am сервиса до 15 минут. Это было ненадежно:
- Сеть могла прерваться
- Inngest worker мог упасть
- Таймауты HTTP соединений

## Решение

Реализована асинхронная архитектура с callback режимом.

### Inngest Callback режим

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

### Примечание

Polling режим был удален. Теперь используется только callback режим через Inngest события.

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

### Запуск асинхронной транскрипции (callback режим)

```typescript
import { startAsyncTranscriptionCallback } from "./gigaam/client";

// Запуск асинхронной задачи
const { taskId } = await startAsyncTranscriptionCallback(audioBuffer, filename);

// Результат будет отправлен через Inngest событие giga-am/transcription.completed
// Обработка результата происходит в callback-handler.ts
```

### Запуск асинхронной диаризированной транскрипции (callback режим)

```typescript
import { startAsyncDiarizedTranscriptionCallback } from "./gigaam/client";

// Запуск асинхронной задачи с диаризацией
const { taskId } = await startAsyncDiarizedTranscriptionCallback(
  audioBuffer,
  filename,
  segments
);

// Результат будет отправлен через Inngest событие giga-am/transcription.completed
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
