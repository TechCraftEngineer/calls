# Speaker Embeddings Service

Отдельный сервис для батч-вычисления speaker embeddings (HF-friendly).

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
      "embedding_dim": 224,
      "count": 1,
      "embeddings": [[...]]
    }
    ```

## Интеграция

В `giga-am` задайте:

- `SPEAKER_EMBEDDINGS_URL=https://<speaker-embeddings>.hf.space`
- `SPEAKER_EMBEDDINGS_TIMEOUT=60`

При недоступности сервиса `giga-am` автоматически использует локальный embedding fallback.
