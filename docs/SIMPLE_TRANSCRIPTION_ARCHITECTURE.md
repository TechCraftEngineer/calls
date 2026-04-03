# Простая архитектура транскрипции

## Обзор

Максимально простая архитектура:

1. **Inngest** вызывает **GigaAM** синхронно
2. **GigaAM** выполняет транскрипцию и возвращает результат
3. **Inngest** продолжает работу с полученным результатом

## Процесс работы

### 1. Inngest → GigaAM (синхронный вызов)
```typescript
// Inngest функция вызывает GigaAM
await inngest.send({
  name: "asr/transcription.sync-request",
  data: {
    audioData: "base64-encoded-audio",
    filename: "meeting.wav"
  }
});
```

### 2. GigaAM обработка
1. Получает аудио данные
2. Выполняет полный pipeline транскрипции
3. Возвращает полный результат

### 3. Inngest продолжает работу
```typescript
// Результат доступен в step.run()
const result = await step.run("transcribe-audio", async () => {
  // GigaAM вернул полный результат
  return transcriptionResult;
});

// Можно продолжить обработку
await step.run("process-results", async () => {
  // LLM коррекция, сохранение и т.д.
});
```

## API эндпоинты

### GigaAM
- `POST /api/transcribe-sync` - Синхронная транскрипция для Inngest
- `POST /api/transcribe` - Асинхронная транскрипция (legacy)
- `GET /api/results/{request_id}` - Получение результатов
- `DELETE /api/results/{request_id}` - Удаление результатов

### Inngest
- `asr/transcription.sync-request` - Запуск синхронной транскрипции

## Преимущества

✅ **Максимальная простота** - Inngest вызывает сервис и ждет  
✅ **Синхронность** - никаких опросов и событий  
✅ **Надежность** - прямой вызов с обработкой ошибок  
✅ **Прозрачность** - полный контроль процесса  
✅ **Гибкость** - можно использовать любой код после транскрипции  

## Конфигурация

### GigaAM (.env)
```bash
# Базовые настройки
TARGET_SAMPLE_RATE=16000
SPEAKER_EMBEDDINGS_URL=http://speaker-embeddings:7860
```

### Inngest (.env)
```bash
# GigaAM URL для вызова
GIGA_AM_URL=http://localhost:8000

# AI провайдеры для LLM коррекции
OPENAI_API_KEY=sk-...
```

## Использование

### Запуск из Inngest
```typescript
import { inngest } from "../client";

// Отправляем запрос на транскрипцию
await inngest.send({
  name: "asr/transcription.sync-request",
  data: {
    audioData: base64AudioData,
    filename: "meeting.wav"
  }
});

// Inngest функция transcription-sync обработает автоматически
```

### Прямой вызов GigaAM (для тестов)
```bash
curl -X POST http://localhost:8000/api/transcribe-sync \
  -F "file=@audio.wav" \
  -F "filename=audio.wav"
```

## Архитектура

### Python сервис (GigaAM)
```
routes/transcribe_sync.py     # Синхронный эндпоинт для Inngest
services/pipeline_service.py  # Обработка аудио
services/storage.py         # Хранение результатов
routes/transcribe.py        # Асинхронный эндпоинт (legacy)
routes/results.py          # API результатов
```

### TypeScript (Inngest)
```
functions/transcription-sync.ts      # Основная функция
functions/transcription-completed.ts  # LLM коррекция (опционально)
```

## Поток данных

```
Inngest функция
    ↓ (HTTP POST)
GigaAM /api/transcribe-sync
    ↓ (синхронная обработка)
Pipeline: Diarization → ASR → Alignment → Postprocess
    ↓ (результат)
Inngest продолжает работу
    ↓ (опционально)
LLM коррекция → Сохранение → Вебхуки
```

## Мониторинг

- **GigaAM**: логи pipeline, время выполнения
- **Inngest**: логи вызовов и ошибок
- **Производительность**: полный pipeline за один вызов

Эта архитектура обеспечивает максимальную простоту и контроль!
