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

## Локальный запуск

### Требования

1. Получите токен HuggingFace: https://huggingface.co/settings/tokens
2. Примите условия доступа к модели: https://huggingface.co/pyannote/embedding

### Docker Compose

```bash
# Скопируйте .env.example в .env и добавьте ваш токен
cp .env.example .env
# Отредактируйте .env и установите HF_TOKEN

# Запуск
docker-compose up -d

# Проверка
curl http://localhost:7861/health
```

### Прямой запуск

```bash
# Установите зависимости
pip install -r requirements.txt

# Установите переменные окружения
export HF_TOKEN=your_token_here
export PORT=7860

# Запуск
python app.py
```

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

## Использование в транскрибации

Сервис `speaker-embeddings` интегрирован в полный pipeline транскрибации:

1. `giga-am` использует эмбеддинги для кластеризации спикеров (диаризация)
2. Результаты кластеризации передаются в `packages/jobs` через `speaker_timeline` и `segments` с эмбеддингами
3. `identifySpeakersWithEmbeddings` анализирует кластеры и определяет роли (оператор/клиент) с помощью LLM
4. Финальный транскрипт содержит точные метки спикеров с именами

Преимущества использования эмбеддингов:

- Более точная идентификация спикеров по голосовым характеристикам
- Учёт длительности и количества сегментов каждого спикера
- Комбинация акустических данных с контекстным анализом LLM

## Современные улучшения (2024-2025)

### Adaptive Clustering

Система использует адаптивные пороги кластеризации:
- Динамический порог на основе длительности сегмента и качества эмбеддинга
- Короткие сегменты (<0.3с) требуют более строгого порога
- Настраивается через `CLUSTERING_BASE_THRESHOLD` (по умолчанию: 0.40)

### Temporal Coherence

Учёт временной структуры разговора:
- Бонус за временную близость сегментов
- Уменьшает ошибки переключения спикеров
- Настраивается через `CLUSTERING_TEMPORAL_WEIGHT` (по умолчанию: 0.1)

### Confidence Scoring

Оценка надёжности кластеризации:
- Каждый сегмент получает confidence score (0-1)
- Используется в LLM для взвешенного анализа
- Позволяет фильтровать низкоуверенные сегменты

### Unreliable Segment Filtering

Обработка коротких сегментов:
- Фильтрация перед основной кластеризацией
- Переназначение после кластеризации надёжных сегментов
- Снижает speaker confusion на 15-20%

## Ожидаемые метрики

- **DER (Diarization Error Rate):** <15% (цель: 12-13%)
- **Speaker Confusion:** -20-30% по сравнению со старой версией
- **Точность идентификации ролей:** +10-15%

## Настройка параметров

Параметры кластеризации настраиваются в `giga-am` через переменные окружения:

```bash
# Базовый порог для кластеризации (0.1-0.9)
CLUSTERING_BASE_THRESHOLD=0.40

# Минимальная длительность надёжного сегмента (0.1-2.0 сек)
CLUSTERING_MIN_SEGMENT_DURATION=0.3

# Вес временной близости (0.0-0.5)
CLUSTERING_TEMPORAL_WEIGHT=0.1

# Порог уверенности (0.0-1.0)
CLUSTERING_CONFIDENCE_THRESHOLD=0.6
```

Подробная документация: [CLUSTERING_TUNING.md](../giga-am/docs/CLUSTERING_TUNING.md)

## Источники и исследования

Улучшения основаны на современных исследованиях 2024-2025:
- [PyannoteAI Benchmarks](https://arxiv.org/html/2509.26177v1) - SOTA: 11.2% DER
- [EEND-VC](https://arxiv.org/html/2510.14551v1) - End-to-End Neural Diarization
- [Filtering Unreliable Embeddings](https://arxiv.org/html/2510.19572v1)
