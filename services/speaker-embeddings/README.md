---
title: Speaker Embeddings Service
emoji: "🎙️"
colorFrom: blue
colorTo: indigo
sdk: docker
python_version: "3.11"
app_file: app.py
pinned: false
---

# Speaker Embeddings Service

Отдельный сервис для батч-вычисления speaker embeddings (HF-friendly).

## Hugging Face Space (Docker)

- Рекомендуемый `SDK`: `Docker`
- Сервис слушает `PORT` из окружения (по умолчанию `7860`)
- Для приватных моделей pyannote добавьте секрет Space:
  - `HF_TOKEN=<your_hf_token>`

### Быстрый чек-лист деплоя

- Создайте новый Space с `SDK = Docker`.
- Загрузите содержимое папки `services/speaker-embeddings` в корень Space.
- В `Settings -> Variables and secrets` добавьте:
  - `Secret`: `HF_TOKEN` (если используете `pyannote/embedding` с доступом по токену).
- Убедитесь, что Space собрался без ошибок (статус `Running`).
- Проверьте здоровье сервиса:
  - `GET /health` должен вернуть `{"status":"healthy", ...}`.
- Проверьте основной endpoint:
  - `POST /api/embed-batch` с `multipart/form-data` (`file` + `segments_json`).
- В `giga-am` установите:
  - `SPEAKER_EMBEDDINGS_URL=https://<your-space>.hf.space`
  - `SPEAKER_EMBEDDINGS_TIMEOUT=60`

## Endpoint

- `POST /api/embed-batch`
  - `file`: audio file
  - `segments_json`: JSON string вида:

    ```json
    { "segments": [ { "start": 0.0, "end": 1.2, "text": "..." } ] }
    ```

  - Ответ:

    ```json
    {
      "success": true,
      "embedding_dim": 222,
      "count": 1,
      "embeddings": [[...]]
    }
    ```

- `GET /health`
  - Проверка работоспособности сервиса.
  - Ответ:

    ```json
    { "status": "healthy", "pyannote_loaded": true }
    ```

## Интеграция

В `giga-am` задайте:

- `SPEAKER_EMBEDDINGS_URL=https://<speaker-embeddings>.hf.space`
- `SPEAKER_EMBEDDINGS_TIMEOUT=60`

При недоступности сервиса `giga-am` автоматически использует локальный embedding fallback.
