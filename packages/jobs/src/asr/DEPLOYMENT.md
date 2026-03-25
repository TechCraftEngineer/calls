# Deployment Guide: ASR с предобработкой аудио

## Архитектура

```text
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────────┐
│         Jobs Service (Node.js)          │
│  ┌───────────────────────────────────┐  │
│  │  Audio Preprocessing (TypeScript) │  │
│  │  ├─ FFmpeg (быстро, базовое)     │  │
│  │  └─ Python Service (ML, качество)│──┼──> Python Audio Enhancer
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Multi-ASR (параллельно)          │  │
│  │  ├─ AssemblyAI                    │  │
│  │  ├─ Yandex SpeechKit              │  │
│  │  └─ Hugging Face (3+ модели)     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  LLM Post-processing              │  │
│  │  ├─ Merge ASR                     │  │
│  │  ├─ Context Correction            │  │
│  │  ├─ Normalize                     │  │
│  │  └─ Summarize                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Варианты развертывания

### 1. Базовая конфигурация (автоматический fallback) ✅ РЕКОМЕНДУЕТСЯ

**Что работает:**
- ✅ Автоматический fallback: Python ML → FFmpeg → без обработки
- ✅ Multi-ASR (AssemblyAI + Yandex + Hugging Face)
- ✅ LLM обработка (merge, context correction, normalize)

**Требования:**
- FFmpeg установлен в Docker образе (уже включен)
- Минимум 1 ASR провайдер (API ключ)
- AI провайдер для LLM (OpenAI/OpenRouter/DeepSeek)

**Docker:**
```yaml
jobs:
  build:
    context: .
    dockerfile: packages/jobs/Dockerfile  # FFmpeg уже включен
  environment:
    # ASR провайдеры (минимум один)
    ASSEMBLYAI_API_KEY: ${ASSEMBLYAI_API_KEY}
    HUGGINGFACE_API_KEY: ${HUGGINGFACE_API_KEY}
    YANDEX_SPEECHKIT_API_KEY: ${YANDEX_SPEECHKIT_API_KEY}
    
    # AI для LLM обработки
    AI_PROVIDER: openrouter
    OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
    
    # Предобработка: автоматический fallback
    # Если AUDIO_ENHANCER_URL не задан → использует FFmpeg
    # Если FFmpeg недоступен → продолжает без обработки
```

**Поведение:**
1. Пытается использовать Python ML (если `AUDIO_ENHANCER_URL` задан)
2. Если Python недоступен → автоматически использует FFmpeg
3. Если FFmpeg недоступен → продолжает без обработки

**Производительность:**
- ~2-5 секунд на минуту аудио (FFmpeg fallback)
- ~10-30 секунд на минуту аудио (полный pipeline)

### 2. Продвинутая конфигурация (с Python ML)

**Дополнительно:**
- ✅ ML-based шумоподавление (noisereduce)
- ✅ Silero VAD для точной детекции речи
- ✅ FFT-based усиление речевых частот
- ✅ Адаптивная нормализация
- ✅ Автоматический fallback на FFmpeg если Python недоступен

**Требования:**
- Python микросервис (Docker контейнер)
- +1GB RAM для PyTorch
- +2-3 секунды обработки

**Docker Compose:**
```yaml
services:
  jobs:
    depends_on:
      - audio-enhancer
    environment:
      AUDIO_ENHANCER_URL: http://audio-enhancer:8080

  audio-enhancer:
    build:
      context: ./services/audio-enhancer
    # Порт 8080 доступен только внутри сети compose (без проброса на хост)
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
```

**Использование:**
```typescript
// По умолчанию автоматически использует Python ML (если доступен)
const result = await runTranscriptionPipeline(audioUrl, {
  audioPreprocessing: {
    usePythonEnhancer: true, // По умолчанию (автоматический fallback)
    noiseReduction: true,
    normalizeVolume: true,
    enhanceSpeech: true,
  },
});
```

**Производительность:**
- ~5-8 секунд на минуту аудио (Python ML)
- ~15-35 секунд на минуту аудио (полный pipeline)

### 3. Принудительно только FFmpeg

```typescript
const result = await runTranscriptionPipeline(audioUrl, {
  audioPreprocessing: {
    usePythonEnhancer: false, // Отключить Python, использовать только FFmpeg
  },
});
```

## Установка

### Шаг 1: Обновить Dockerfile

Уже сделано! FFmpeg добавлен в `packages/jobs/Dockerfile`:
```dockerfile
FROM oven/bun:1.3.11-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat ffmpeg  # ← Добавлено
```

### Шаг 2: Настроить переменные окружения

Добавьте в `.env`:
```bash
# Минимальная конфигурация (только FFmpeg)
# Ничего дополнительного не нужно

# Продвинутая конфигурация (с Python)
AUDIO_ENHANCER_URL=http://audio-enhancer:8080
```

### Шаг 3: Запустить сервисы

**Минимальная:**
```bash
docker-compose --profile jobs up -d
```

**Продвинутая:**
```bash
# Сначала собрать Python сервис
docker-compose build audio-enhancer

# Запустить всё
docker-compose --profile jobs up -d
```

### Шаг 4: Проверить работу

```bash
# Проверка FFmpeg
docker compose exec jobs ffmpeg -version

# Проверка Python-сервиса из контейнера (порт 8080 только внутри сети compose)
docker compose exec audio-enhancer wget -qO- http://127.0.0.1:8080/health
```

## Мониторинг

### Логи предобработки

```bash
# FFmpeg обработка
docker compose logs jobs | grep "asr-audio-preprocessing"

# Python обработка
docker compose logs audio-enhancer | grep "INFO"
```

### Метрики

Логируются автоматически:
- Время предобработки (ms)
- Примененные фильтры
- Размер входного/выходного аудио
- Успешность обработки

Пример лога:
```text
[asr-audio-preprocessing] Предобработка аудио завершена
  processingTimeMs: 2341
  appliedFilters: ["dynaudnorm", "equalizer", "16000Hz", "mono"]
  
[asr-pipeline] Аудио предобработано
  audioPreprocessed: true
```

## Troubleshooting

### FFmpeg не найден

**Симптом:**
```text
FFmpeg не найден, пропускаем предобработку аудио
```

**Решение:**
1. Пересобрать Docker образ: `docker-compose build jobs`
2. Проверить: `docker compose exec jobs ffmpeg -version`

### Python сервис недоступен

**Симптом:**
```text
Python enhancer недоступен по адресу http://audio-enhancer:8080
```

**Решение:**
1. Проверить статус: `docker compose ps audio-enhancer`
2. Проверить логи: `docker compose logs audio-enhancer`
3. Проверить health из контейнера: `docker compose exec audio-enhancer wget -qO- http://127.0.0.1:8080/health`

### Out of memory (Python)

**Симптом:**
```text
Killed (OOM)
```

**Решение:**
Увеличить лимит памяти в `docker-compose.yml`:
```yaml
audio-enhancer:
  deploy:
    resources:
      limits:
        memory: 2G  # Увеличить с 1G
```

### Медленная обработка

**Решение 1:** Отключить Python enhancer
```typescript
audioPreprocessing: {
  usePythonEnhancer: false, // Использовать только FFmpeg
}
```

**Решение 2:** Уменьшить агрессивность
```typescript
audioPreprocessing: {
  usePythonEnhancer: true,
  noiseReduction: false, // Отключить самый медленный фильтр
  removeSilence: false,
}
```

**Решение 3:** Использовать GPU (если доступен)
```yaml
audio-enhancer:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

## Рекомендации по production

### Для большинства случаев (рекомендуется) ✅

```yaml
# docker-compose.yml
jobs:
  environment:
    # Автоматический fallback: Python ML → FFmpeg → без обработки
    # Если AUDIO_ENHANCER_URL не задан → использует FFmpeg
```

```typescript
// Настройки по умолчанию (автоматический fallback)
const result = await runTranscriptionPipeline(audioUrl, {
  // audioPreprocessing не задан = используются defaults
  // usePythonEnhancer: true (автоматический fallback на FFmpeg)
  // normalizeVolume: true
  // enhanceSpeech: true
  // noiseReduction: false
});
```

**Поведение:**
- Пытается Python ML (если `AUDIO_ENHANCER_URL` задан)
- Если недоступен → автоматически FFmpeg
- Если FFmpeg недоступен → без обработки

### Для очень зашумленных записей (с Python ML)

```yaml
# docker-compose.yml
jobs:
  depends_on:
    - audio-enhancer
  environment:
    AUDIO_ENHANCER_URL: http://audio-enhancer:8080

audio-enhancer:
  build: ./services/audio-enhancer
  deploy:
    resources:
      limits:
        memory: 2G
```

```typescript
const result = await runTranscriptionPipeline(audioUrl, {
  audioPreprocessing: {
    usePythonEnhancer: true, // По умолчанию (автоматический fallback)
    noiseReduction: true, // ML шумоподавление
    normalizeVolume: true,
    enhanceSpeech: true,
  },
});
```

### Принудительно только FFmpeg (без Python)

```typescript
const result = await runTranscriptionPipeline(audioUrl, {
  audioPreprocessing: {
    usePythonEnhancer: false, // Отключить Python, использовать только FFmpeg
  },
});
```

### Масштабирование

**Горизонтальное:**
```yaml
audio-enhancer:
  deploy:
    replicas: 3  # Несколько инстансов
```

**Вертикальное:**
```yaml
audio-enhancer:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

## Стоимость

### FFmpeg (минимальная конфигурация)

- Вычисления: ~$0.001 на минуту аудио
- Память: +50MB RAM
- Хранилище: временные файлы удаляются автоматически

### Python ML (продвинутая конфигурация)

- Вычисления: ~$0.003 на минуту аудио
- Память: +1GB RAM (PyTorch)
- Хранилище: +500MB (модели)

### Итого на 1000 минут аудио/месяц

- Минимальная: ~$1
- Продвинутая: ~$3

(Не включая стоимость ASR провайдеров и LLM)
