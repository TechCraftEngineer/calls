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

- `POST /api/transcribe` - Синхронное распознавание речи из аудиофайла
- `GET /api/health` - Проверка работоспособности
- `GET /api/info` - Информация о приложении
- `GET /docs` - Swagger документация

### Пример запроса (sync)

```bash
curl -X POST "https://your-space.hf.space/api/transcribe" \
  -F "file=@audio.mp3"
```

Ответ:

```json
{
  "success": true,
  "segments": [],
  "total_duration": 0
}
```

## Поддерживаемые форматы

MP3, WAV, FLAC, M4A, AAC, OGG, WEBM (макс. 100MB)

## Настройка

Добавьте в Repository Settings → Secrets:

1. Получите токен: https://huggingface.co/settings/tokens
2. Примите условия: https://huggingface.co/pyannote/segmentation-3.0
3. Добавьте токен в Secrets как `HF_TOKEN`
4. Оркестрация pipeline выполняется в Inngest. `giga-am` должен обрабатывать только sync `POST /api/transcribe`.

Пример:

- `TRANSCRIPTION_TIMEOUT=300`
- `SPEAKER_EMBEDDINGS_URL=https://<your-speaker-embeddings-space>.hf.space` (опционально)
- `SPEAKER_EMBEDDINGS_TIMEOUT=60`
