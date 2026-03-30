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
- `GET /api/health` - Проверка работоспособности
- `GET /api/info` - Информация о приложении
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

## Настройка

Для работы с длинными аудио добавьте `HF_TOKEN` в Repository Settings → Secrets:

1. Получите токен: https://huggingface.co/settings/tokens
2. Примите условия: https://huggingface.co/pyannote/segmentation-3.0
3. Добавьте токен в Secrets как `HF_TOKEN`

### Переменные окружения

- `TRANSCRIPTION_TIMEOUT` - Таймаут распознавания в секундах (по умолчанию 900 = 15 минут)
- `MODEL_LOADING_TIMEOUT` - Таймаут загрузки модели в секундах (по умолчанию 600 = 10 минут)
- `HF_TOKEN` - Токен для доступа к pyannote/segmentation-3.0
