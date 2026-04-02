# Dual ASR + LLM Correction (через Inngest)

Улучшенный pipeline для максимальной точности транскрипции с диаризацией.

## Архитектура

```
GigaAM:
  Full ASR → Full Transcript
  Diarization → Diarized ASR → Segments
  ↓
  Send Event to Inngest
  
Inngest (асинхронно):
  Full Transcript + Segments → LLM Correction → Corrected Segments
  ↓
  Webhook/Callback (опционально)
```

## Преимущества новой архитектуры

1. **Разделение ответственности**
   - GigaAM: только ASR и диаризация
   - Inngest: LLM коррекция и оркестрация
   - Чистая архитектура

2. **Асинхронность**
   - GigaAM возвращает результат сразу
   - LLM коррекция выполняется в фоне
   - Не блокирует основной pipeline

3. **Масштабируемость**
   - Inngest автоматически масштабирует LLM задачи
   - Retry логика встроена
   - Мониторинг из коробки

4. **Надёжность**
   - Если Inngest недоступен - работает без коррекции
   - Если LLM падает - retry автоматически
   - Результаты сохраняются в Inngest

## Настройка

### 1. GigaAM (.env)

```bash
# Включение Dual ASR + LLM
ENABLE_DUAL_ASR_LLM_CORRECTION=true

# Inngest API
INNGEST_API_URL=http://localhost:3001
INNGEST_EVENT_KEY=your-event-key  # Опционально
```

**LLM настройки в Inngest** (packages/jobs/.env):

```bash
# AI Provider (использует @calls/config и @calls/ai)
AI_PROVIDER=openrouter
AI_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=sk-or-v1-...

# Или используйте другой провайдер
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...
```

### 2. Inngest

Функция `transcription-completed` автоматически зарегистрирована в `packages/jobs`.

## Pipeline

### Шаг 1: GigaAM выполняет ASR

```python
# 1. Full ASR (без диаризации)
full_transcript = transcribe_full_audio(audio)

# 2. Diarization + Diarized ASR
segments = diarize_and_transcribe(audio)

# 3. Отправка в Inngest
inngest_client.send_dual_asr_correction_request(
    full_transcript=full_transcript,
    diarized_segments=segments,
    request_id=request_id,
)

# 4. Возврат результата (без ожидания LLM)
return segments
```

### Шаг 2: Inngest выполняет LLM коррекцию

```typescript
// Inngest функция автоматически триггерится
export const dualAsrLlmCorrectionFn = inngest.createFunction(
  {
    id: "dual-asr-llm-correction",
    retries: 2,
  },
  async ({ event }) => {
    const { fullTranscript, diarizedSegments, config } = event.data;
    
    // 1. Построение промпта
    const prompt = buildCorrectionPrompt(fullTranscript, diarizedSegments);
    
    // 2. Вызов LLM
    const corrected = await callLLM(prompt, config);
    
    // 3. Валидация
    const validated = validateCorrections(diarizedSegments, corrected);
    
    return validated;
  }
);
```

## Как работает

### 1. Синхронный режим (по умолчанию)

GigaAM возвращает результат сразу, LLM коррекция в фоне:

```
Request → GigaAM → Response (diarized segments)
                ↓
              Inngest → LLM → Corrected segments (async)
```

### 2. Асинхронный режим с callback

Можно настроить webhook для получения исправленных сегментов:

```bash
# В event data
{
  "fullTranscript": "...",
  "diarizedSegments": [...],
  "callbackUrl": "https://your-api.com/webhook/llm-correction",
  "requestId": "..."
}
```

## Мониторинг

### Inngest Dashboard

Все запросы видны в Inngest UI:

- Статус выполнения
- Время обработки
- Ошибки и retry
- Логи

### GigaAM логи

```
[request-id] Dual ASR mode: выполняем полную транскрипцию для контекста
[request-id] Полная транскрипция завершена за 5.23s: 1234 символов
[request-id] Отправляем запрос на LLM коррекцию в Inngest
[request-id] Запрос на LLM коррекцию отправлен в Inngest: {...}
```

## Преимущества vs старый подход

| Аспект | Старый (LLM в GigaAM) | Новый (LLM в Inngest) |
|--------|----------------------|----------------------|
| Блокирование | Да (ждём LLM) | Нет (асинхронно) |
| Retry | Ручная логика | Встроенная в Inngest |
| Мониторинг | Логи | Inngest Dashboard |
| Масштабирование | Ручное | Автоматическое |
| Отказоустойчивость | Fallback в коде | Inngest retry |
| Разделение | Всё в GigaAM | Чистая архитектура |

## Примеры

### Базовое использование

```python
# GigaAM автоматически отправит в Inngest если включено
result = pipeline_service.run_ultra_pipeline(
    audio_path="audio.wav",
    request_id="req-123",
)

# Результат возвращается сразу (без LLM коррекции)
print(result["segments"])  # Оригинальные сегменты

# LLM коррекция выполняется в фоне в Inngest
```

### С callback

```python
# Добавить callback URL в metadata
# (требует модификации для поддержки callback)
```

## Отключение

Если не нужна LLM коррекция:

```bash
ENABLE_DUAL_ASR_LLM_CORRECTION=false
```

Pipeline вернётся к стандартному режиму: `Diarization → ASR`

## Troubleshooting

### Inngest недоступен

Проверьте:

```bash
curl http://localhost:3001/health
```

### Event не отправляется

Проверьте логи GigaAM:

```bash
docker-compose logs giga-am | grep "Inngest"
```

### LLM коррекция не выполняется

Проверьте Inngest Dashboard:

- Функция зарегистрирована?
- Event получен?
- Есть ошибки?

## Дальнейшие улучшения

1. **Webhook для результатов**
   - Callback URL в event data
   - Автоматическое обновление сегментов

2. **Batch обработка**
   - Группировка нескольких запросов
   - Экономия на LLM API

3. **Кэширование**
   - Кэш похожих транскрипций
   - Уменьшение вызовов LLM

4. **Приоритеты**
   - Важные запросы обрабатываются первыми
   - Очереди в Inngest

## Концепция

Традиционный подход: `Diarization → ASR по сегментам`

Проблема: ASR на коротких сегментах теряет контекст и делает больше ошибок, особенно на границах между спикерами.

Наш подход: `Full ASR → Diarization → Diarized ASR → LLM Correction`

## Pipeline

```
1. Full ASR (без диаризации)
   ↓
   Полная транскрипция с максимальным контекстом
   
2. Diarization (pyannote)
   ↓
   Точные границы спикеров
   
3. Diarized ASR (по сегментам)
   ↓
   Транскрипция с разделением по спикерам
   
4. LLM Correction
   ↓
   Объединяет оба варианта, исправляет ошибки
   
5. Final Result
   ↓
   Максимально точная транскрипция с диаризацией
```

## Преимущества

1. **Лучшее качество на границах**
   - Full ASR видит полный контекст
   - Diarized ASR знает точные границы
   - LLM объединяет лучшее из обоих

2. **Исправление ошибок ASR**
   - LLM использует контекст для исправления
   - Особенно эффективно на коротких сегментах
   - Улучшает распознавание имён, терминов

3. **Улучшенное форматирование**
   - Правильная пунктуация
   - Заглавные буквы
   - Структурированный текст

## Недостатки

1. **Скорость**: В 2-3 раза медленнее (два прохода ASR + LLM)
2. **Стоимость**: Требует LLM API (OpenAI, Anthropic и др.)
3. **Сложность**: Больше точек отказа

## Настройка

### 1. Включение/выключение

```bash
# GigaAM .env
ENABLE_DUAL_ASR_LLM_CORRECTION=true  # По умолчанию включено
```

### 2. AI Provider настройки (Inngest)

В `packages/jobs/.env` настройте AI провайдер через `@calls/config`:

```bash
# OpenRouter (рекомендуется)
AI_PROVIDER=openrouter
AI_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=sk-or-v1-...

# Или OpenAI
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

# Или DeepSeek
AI_PROVIDER=deepseek
### 3. Дополнительные параметры

AI SDK (`@calls/ai`) автоматически обрабатывает:
- Retry при ошибках (встроенный fallback механизм)
- Timeout (через параметры `generateWithAi`)
- Fallback на другие провайдеры (если настроено несколько API ключей)

Inngest функция автоматически возвращает оригинальные сегменты при ошибке LLM.

## Как работает LLM коррекция

### Промпт

## Как работает LLM коррекция

### Промпт

LLM получает:

1. Полную транскрипцию (контекст)
2. Сегменты с диаризацией (структура)
3. Инструкции по коррекции

### Задача LLM

- Использовать контекст из полной транскрипции
- Исправить ошибки в сегментах
- Улучшить пунктуацию и форматирование
- **НЕ менять** временные метки и ID спикеров
- **НЕ объединять** и **НЕ разделять** сегменты

### Валидация

После LLM коррекции:

- Проверяем количество сегментов (должно совпадать)
- Проверяем временные метки (не должны измениться)
- Проверяем ID спикеров (не должны измениться)
- При ошибках используем оригинальные значения

## Примеры

### Без LLM коррекции

```json
{
  "segments": [
    {"speaker": "SPEAKER_00", "text": "алло"},
    {"speaker": "SPEAKER_01", "text": "привет"},
    {"speaker": "SPEAKER_00", "text": "никит доброе утро никит два вопроса по оплате"}
  ]
}
```

### С LLM коррекцией

```json
{
  "segments": [
    {"speaker": "SPEAKER_00", "text": "Алло."},
    {"speaker": "SPEAKER_01", "text": "Привет."},
    {"speaker": "SPEAKER_00", "text": "Никита, доброе утро. Никита, два вопроса по оплате."}
  ]
}
```

Улучшения:

- Заглавные буквы
- Правильное имя (Никита вместо никит)
- Пунктуация

## Метрики

Pipeline добавляет метрики:

- `full_asr_time` - время полной транскрипции
- `llm_correction_time` - время LLM коррекции
- `corrections_applied` - количество исправленных сегментов

## Отключение

Если не нужна максимальная точность или важна скорость:

```bash
ENABLE_DUAL_ASR_LLM_CORRECTION=false
```

Pipeline вернётся к стандартному режиму: `Diarization → ASR`

## Рекомендации

### Когда использовать

✅ Критичные применения (медицина, юриспруденция)
✅ Важна максимальная точность
✅ Есть бюджет на LLM API
✅ Скорость не критична

### Когда НЕ использовать

❌ Real-time транскрипция
❌ Большие объёмы (высокая стоимость)
❌ Нет LLM API
❌ Достаточно стандартной точности

## Стоимость

Примерная стоимость на gpt-4o-mini:

- 1 минута аудио ≈ 500-1000 токенов промпт
- 1 минута аудио ≈ 300-600 токенов ответ
- Итого: ~$0.0001-0.0003 за минуту

Для 1 часа аудио: ~$0.006-0.018

## Troubleshooting

### LLM не отвечает

Проверьте:

1. AI провайдер настроен в `packages/jobs/.env`
2. `AI_PROVIDER` и соответствующий API ключ установлены
3. Модель доступна для вашего провайдера
4. Inngest запущен и получает events

### LLM возвращает неправильный формат

- Используйте модели с поддержкой JSON mode
- gpt-4o-mini, gpt-4o - работают хорошо
- Старые модели могут не поддерживать `response_format`

### Сегменты не исправляются

Проверьте логи:

```bash
docker-compose logs giga-am | grep "LLM correction"
```

Возможные причины:

- LLM не нашёл ошибок (текст уже правильный)
- Fallback на оригинальные сегменты из-за ошибки
- Валидация отклонила изменения

## Мониторинг

Логи показывают:

- Время каждого этапа
- Количество исправленных сегментов
- Значительные изменения текста
- Ошибки и fallback

```
[request-id] Dual ASR mode: выполняем полную транскрипцию для контекста
[request-id] Полная транскрипция завершена за 5.23s: 1234 символов
[request-id] Применяем LLM коррекцию с использованием полной транскрипции
[request-id] LLM correction completed in 3.45s: 15 segments corrected
[request-id] Validation complete: 12/15 segments corrected
```

## Дальнейшие улучшения

Возможные направления:

1. Кэширование LLM ответов для похожих сегментов
2. Batch обработка нескольких файлов
3. Fine-tuning LLM на специфичных доменах
4. Использование локальных LLM (Llama, Mistral)
