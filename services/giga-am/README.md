---
title: GigaAM Russian Speech Recognition
emoji: 🎤
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
app_port: 7860
---

# GigaAM - API для распознавания русской речи

REST API для распознавания русской речи на базе GigaAM-v3-e2e-RNNT.

## Использование

### API Эндпоинты

- `POST /api/transcribe` - Распознавание речи из аудиофайла
- `POST /api/debug-embeddings` - Диагностика проблем с диаризацией спикеров
- `GET /api/health` - Проверка работоспособности
- `GET /api/info` - Информация о приложении
- `GET /api/metrics` - Метрики производительности
- `GET /api/cache/stats` - Статистика кэша
- `GET /docs` - Swagger документация

### Пример запроса

```bash
curl -X POST "https://your-space.hf.space/api/transcribe" \
  -F "file=@audio.mp3"
```

### Ответ

```json
{
  "success": true,
  "segments": [
    {
      "text": "Привет, как дела?",
      "start": 0.5,
      "end": 2.1,
      "start_formatted": "00:00:00.500",
      "end_formatted": "00:00:02.100",
      "duration": 1.6
    }
  ],
  "total_duration": 2.1
}
```

## Поддерживаемые форматы

MP3, WAV, FLAC, M4A, AAC, OGG, WEBM (макс. 100MB)

## Диаризация спикеров (Speaker Diarization)

API автоматически определяет разных спикеров в диалоге.

### Автоматическое улучшение качества аудио ✨

Сервис автоматически апсемплирует аудио до 16kHz, если sample rate ниже.
Это значительно улучшает качество диаризации без дополнительных действий.

**Пример:**
- Входное аудио: 8000 Hz → Автоматически → 16000 Hz
- Результат: Корректное определение спикеров

**Настройка:**
```bash
# Включено по умолчанию
export AUTO_RESAMPLE_ENABLED=true
export TARGET_SAMPLE_RATE=16000

# Отключить (не рекомендуется)
export AUTO_RESAMPLE_ENABLED=false
```

Подробнее: [AUTO_RESAMPLE.md](AUTO_RESAMPLE.md)

### Проблемы с диаризацией?

Если все сегменты получают `SPEAKER_01`, используйте диагностику:

```bash
curl -X POST "http://localhost:7860/api/debug-embeddings" \
  -F "file=@audio.mp3" | jq .
```

Система автоматически выдаст рекомендации по настройке параметров.

**Документация:**
- [QUICK_FIX_DIARIZATION.md](QUICK_FIX_DIARIZATION.md) - Быстрое решение
- [DIARIZATION_ANALYSIS.md](DIARIZATION_ANALYSIS.md) - Детальный анализ
- [DIARIZATION_DEBUG.md](DIARIZATION_DEBUG.md) - Полная диагностика
- [docs/CLUSTERING_TUNING.md](docs/CLUSTERING_TUNING.md) - Настройка параметров

### Параметры кластеризации

```bash
# Строгая кластеризация (больше спикеров)
export CLUSTERING_BASE_THRESHOLD=0.30

# Мягкая кластеризация (меньше спикеров)
export CLUSTERING_BASE_THRESHOLD=0.45

# Другие параметры
export CLUSTERING_MIN_SEGMENT_DURATION=0.3
export CLUSTERING_TEMPORAL_WEIGHT=0.1
export CLUSTERING_CONFIDENCE_THRESHOLD=0.6
```

## Настройка

Для работы с длинными аудио добавьте `HF_TOKEN` в Repository Settings → Secrets:

1. Получите токен: https://huggingface.co/settings/tokens
2. Примите условия: https://huggingface.co/pyannote/segmentation-3.0
3. Добавьте токен в Secrets как `HF_TOKEN`

### Переменные окружения

- `TRANSCRIPTION_TIMEOUT` - Таймаут распознавания в секундах (по умолчанию 900 = 15 минут)
- `MODEL_LOADING_TIMEOUT` - Таймаут загрузки модели в секундах (по умолчанию 600 = 10 минут)
- `HF_TOKEN` - Токен для доступа к pyannote/segmentation-3.0
