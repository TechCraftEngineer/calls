# Рефакторинг app.py

## Проблема

Файл `app.py` был слишком большим (~600+ строк) и содержал:
- Инициализацию всех сервисов
- Функцию предобработки аудио
- Полный pipeline обработки
- Все API endpoints
- Диагностический код

## Решение

Код разделён на модули по ответственности:

### 1. `services/audio_preprocessing.py`

Предобработка аудио для улучшения диаризации:
- `preprocess_audio_for_diarization()` - апсемплинг аудио
- `cleanup_processed_audio()` - очистка временных файлов

### 2. `services/pipeline_service.py`

Полный pipeline обработки аудио:
- `run_ultra_pipeline()` - основная функция pipeline
- Инициализация всех сервисов
- Координация этапов обработки

### 3. `app.py` (упрощённый)

Только API endpoints и роутинг:
- FastAPI приложение
- API endpoints
- Обработка запросов
- Валидация

## Структура после рефакторинга

```
services/giga-am/
├── app.py                          # API endpoints (~400 строк)
├── config.py                       # Конфигурация
├── services/
│   ├── audio_preprocessing.py     # Предобработка аудио
│   ├── pipeline_service.py        # Pipeline обработки
│   ├── transcription_service.py   # ASR
│   ├── embedding_service.py       # Эмбеддинги
│   ├── clustering_service.py      # Кластеризация
│   ├── alignment_service.py       # Выравнивание
│   ├── attribution_service.py     # Attribution
│   ├── postprocess_service.py     # Постобработка
│   └── overlap_handler.py         # Overlap processing
└── utils/
    ├── file_validation.py         # Валидация файлов
    ├── metrics.py                 # Метрики
    └── cache.py                   # Кэширование
```

## Преимущества

1. **Читаемость**: Каждый модуль отвечает за одну задачу
2. **Тестируемость**: Легко тестировать отдельные модули
3. **Поддерживаемость**: Проще находить и исправлять баги
4. **Переиспользование**: Модули можно использовать независимо
5. **Масштабируемость**: Легко добавлять новые функции

## Миграция

Изменения обратно совместимы. API endpoints остались прежними:
- `POST /api/transcribe`
- `POST /api/debug-embeddings`
- `GET /api/health`
- `GET /api/info`
- `GET /api/metrics`

## Использование

### Импорт pipeline

```python
from services.pipeline_service import run_ultra_pipeline

result = run_ultra_pipeline(
    audio_path="audio.mp3",
    preprocess_metadata=None,
    request_id="request-123"
)
```

### Импорт предобработки

```python
from services.audio_preprocessing import (
    preprocess_audio_for_diarization,
    cleanup_processed_audio
)

processed_path = preprocess_audio_for_diarization("audio.mp3", "request-123")
# ... обработка ...
cleanup_processed_audio(processed_path, "audio.mp3", "request-123")
```

### Импорт отдельных сервисов

```python
from services.pipeline_service import (
    embedding_service,
    clustering_service,
    alignment_service
)

embeddings = embedding_service.build_batch_hybrid_embeddings(...)
clusters = clustering_service.assign_speakers(...)
```

## Тестирование

Каждый модуль можно тестировать независимо:

```python
# Тест предобработки
from services.audio_preprocessing import preprocess_audio_for_diarization

def test_resample_low_quality():
    result = preprocess_audio_for_diarization("8khz_audio.mp3", "test")
    assert result.endswith("_16000hz.wav")

# Тест pipeline
from services.pipeline_service import run_ultra_pipeline

def test_full_pipeline():
    result = run_ultra_pipeline("audio.mp3", None, "test")
    assert result["success"] == True
    assert len(result["segments"]) > 0
```

## Дальнейшие улучшения

Возможные направления:
1. Вынести диагностический endpoint в отдельный модуль
2. Создать базовый класс для всех сервисов
3. Добавить dependency injection
4. Создать фабрики для сервисов
