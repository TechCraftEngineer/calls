# Простая архитектура транскрипции

## Обзор

Простая и надежная архитектура обработки транскрипции:

1. **GigaAM** обрабатывает аудио и отправляет результат в Inngest
2. **Inngest** получает результат и выполняет LLM коррекцию
3. **Никаких опросов** - прямая передача результатов

## Процесс работы

### 1. Клиент → GigaAM
```bash
POST /api/transcribe
Content-Type: multipart/form-data

file: [audio_file]
```

**Ответ GigaAM (мгновенно):**
```json
{
  "request_id": "abc-123-def-456",
  "status": "processing",
  "message": "Транскрипция началась",
  "results_url": "/api/results/abc-123-def-456"
}
```

### 2. GigaAM → Inngest (фоновая обработка)
GigaAM обрабатывает аудио в фоне и отправляет событие:
```json
{
  "name": "asr/transcription.completed",
  "data": {
    "requestId": "abc-123-def-456",
    "transcriptionResult": {
      "success": true,
      "segments": [...],
      "final_transcript": "...",
      "pipeline": "pyannote-diarization-sota-2026"
    }
  }
}
```

### 3. Inngest → LLM коррекция → Сохранение
Inngest функция `transcription-completed` обрабатывает результат:
- Валидация данных
- LLM коррекция (если включена)
- Сохранение в базу
- Отправка вебхуков

## API эндпоинты

### GigaAM
- `POST /api/transcribe` - Загрузка аудио
- `GET /api/results/{request_id}` - Получение результатов (для отладки)
- `DELETE /api/results/{request_id}` - Очистка результатов

### Inngest
- `asr/transcription.completed` - Обработка завершенной транскрипции

## Преимущества

✅ **Простота** - Минимум компонентов и зависимостей  
✅ **Надежность** - Прямая передача данных без потерь  
✅ **Производительность** - GigaAM не блокируется ожиданием  
✅ **Масштабируемость** - Легко обрабатывать много запросов  

## Конфигурация

### GigaAM (.env)
```bash
# Inngest подключение
INNGEST_API_URL=http://localhost:3001
INNGEST_EVENT_KEY=your-event-key
```

### Inngest (.env)
```bash
# AI провайдеры для LLM коррекции
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...

# GigaAM URL
GIGA_AM_URL=http://localhost:8000
```

## Использование

### Простой вызов
```typescript
// Клиент загружает аудио
const response = await fetch('http://localhost:8000/api/transcribe', {
  method: 'POST',
  body: formData
});

const { request_id } = await response.json();
console.log('Транскрипция началась:', request_id);
// Результат будет обработан автоматически в Inngest
```

### Отладка
```typescript
// Проверить статус (опционально)
const result = await fetch(`http://localhost:8000/api/results/${request_id}`);
const data = await result.json();
console.log('Статус:', data.status);
```

## Мониторинг

- **GigaAM**: логи обработки аудио
- **Inngest**: логи LLM коррекции и сохранения
- **Метрики**: время обработки, количество запросов

Эта архитектура обеспечивает максимальную простоту и надежность!
