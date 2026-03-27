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
- `POST /api/jobs` - Создать async Ultra-SOTA задачу
- `GET /api/jobs` - Список задач (limit/offset/status)
- `GET /api/jobs/{job_id}` - Статус/прогресс/результат задачи
- `POST /api/jobs/{job_id}/cancel` - Отмена задачи
- `GET /api/health` - Проверка работоспособности
- `GET /api/info` - Информация о приложении
- `GET /docs` - Swagger документация

### Пример запроса (async pipeline)

```bash
curl -X POST "https://your-space.hf.space/api/jobs" \
  -F "file=@audio.mp3"

# Или по URL:
curl -X POST "https://your-space.hf.space/api/jobs" \
  -F "source_url=https://example.com/call.wav" \
  -F "callback_url=https://your-system.example/webhooks/transcription"
```

Ответ:

```json
{
  "job_id": "c4f9b8bb-....",
  "status": "queued",
  "progress": 0.0
}
```

Проверка статуса:

```bash
curl "https://your-space.hf.space/api/jobs/<job_id>"

# Список задач:
curl "https://your-space.hf.space/api/jobs?limit=20"

# Список только завершенных задач:
curl "https://your-space.hf.space/api/jobs?limit=20&offset=0&status=done"
```

## Поддерживаемые форматы

MP3, WAV, FLAC, M4A, AAC, OGG, WEBM (макс. 100MB)

## Настройка

Для двух Space pipeline добавьте в Repository Settings → Secrets:

1. Получите токен: https://huggingface.co/settings/tokens
2. Примите условия: https://huggingface.co/pyannote/segmentation-3.0
3. Добавьте токен в Secrets как `HF_TOKEN`
4. Препроцесс аудио выполняется **вне** giga-am (оркестратор Inngest вызывает audio-enhancer `/preprocess`, затем передаёт WAV и `preprocess_metadata_json` в `POST /api/jobs`). Секрет `AUDIO_ENHANCER_URL` в **giga-am не нужен**.

Пример:

- `JOBS_DIR=/home/user/app/temp/jobs`
- `MAX_JOB_RETRIES=2`
- `SOURCE_DOWNLOAD_TIMEOUT=120`
- `LLM_API_URL=https://api.openai.com/v1/chat/completions`
- `LLM_API_KEY=...`
- `LLM_MODEL=gpt-4o-mini`
- `STRICT_CORRECTION_MODE=true`
- `CALLBACK_TIMEOUT=20`
