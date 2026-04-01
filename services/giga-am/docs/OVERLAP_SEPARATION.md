# Разделение одновременной речи (Overlapping Speech Separation)

## Обзор

Система поддерживает распознавание и разделение спикеров, говорящих одновременно. Это критично для:

- Активных дискуссий с перебиваниями
- Конференц-звонков с несколькими участниками
- Эмоциональных разговоров
- Споров и конфликтных ситуаций

## Как это работает

### Pipeline обработки overlap

```
1. Preprocessing → Детекция overlap регионов (ML-based VAD)
                ↓
2. ASR → Распознавание речи с временными метками
                ↓
3. Embedding → Вычисление speaker embeddings для каждого сегмента
                ↓
4. Clustering → Кластеризация спикеров
                ↓
5. Overlap Separation → Разделение одновременно говорящих
   ├─ Детекция overlap регионов (temporal + preprocessing)
   ├─ Анализ эмбеддингов в overlap
   ├─ Сравнение с известными кластерами
   └─ Создание sub-segments для каждого спикера
                ↓
6. Attribution → Построение timeline с overlap
```

### Методы детекции overlap

**1. Preprocessing-based (ML VAD)**

- Используется Silero VAD или аналог
- Детектирует регионы с несколькими голосами
- Передаётся как `overlap_candidates` в метаданных

**2. Temporal Analysis**

- Анализ временных пересечений сегментов
- Если два сегмента пересекаются по времени → overlap
- Работает даже без preprocessing

**3. Embedding-based**

- Анализ эмбеддингов в overlap регионах
- Сравнение с известными кластерами спикеров
- Разделение на основе cosine similarity

## Параметры

### OVERLAP_SEPARATION_ENABLED (по умолчанию: true)

**Описание:** Включить/выключить разделение одновременной речи

**Значения:**

- `true`: Включено (рекомендуется)
- `false`: Выключено (только маркировка overlap)

**Когда выключать:**

- Монологи или презентации (нет overlap)
- Очень чистые диалоги без перебиваний
- Для ускорения обработки

**Пример:**

```bash
OVERLAP_SEPARATION_ENABLED=true
```

### OVERLAP_CONFIDENCE_THRESHOLD (по умолчанию: 0.7)

**Описание:** Порог уверенности для детекции overlap

**Диапазон:** 0.0 - 1.0

**Как работает:**

- Overlap регионы с confidence ниже порога игнорируются
- Высокий порог = меньше ложных overlap
- Низкий порог = больше детектированных overlap

**Рекомендации:**

- `0.6-0.65`: Мягкий порог, детектирует больше overlap
- `0.7-0.75`: Сбалансированный (рекомендуется)
- `0.8-0.9`: Строгий порог, только явные overlap

**Пример:**

```bash
OVERLAP_CONFIDENCE_THRESHOLD=0.7
```

### MIN_OVERLAP_DURATION (по умолчанию: 0.5)

**Описание:** Минимальная длительность overlap для обработки (в секундах)

**Диапазон:** 0.1 - 5.0 секунд

**Как работает:**

- Overlap короче этого порога игнорируются
- Короткие overlap часто являются артефактами ASR
- Длинные overlap требуют разделения

**Рекомендации:**

- `0.3-0.4`: Для быстрых перебиваний
- `0.5-0.6`: Сбалансированный (рекомендуется)
- `0.7-1.0`: Только длинные overlap

**Пример:**

```bash
MIN_OVERLAP_DURATION=0.5
```

### OVERLAP_EMBEDDING_SIMILARITY (по умолчанию: 0.6)

**Описание:** Порог схожести эмбеддингов для разделения спикеров в overlap

**Диапазон:** 0.0 - 1.0

**Как работает:**

- Сравнивает эмбеддинг overlap сегмента с центроидами кластеров
- Если similarity >= порог → спикер идентифицирован
- Если similarity < порог → неизвестный спикер

**Рекомендации:**

- `0.5-0.55`: Мягкий порог, больше разделений
- `0.6-0.65`: Сбалансированный (рекомендуется)
- `0.7-0.8`: Строгий порог, только уверенные разделения

**Пример:**

```bash
OVERLAP_EMBEDDING_SIMILARITY=0.6
```

## Результат

### Без overlap separation

```json
{
  "segments": [
    {
      "start": 10.0,
      "end": 12.5,
      "speaker": "SPEAKER_01",
      "text": "Я думаю что...",
      "overlap": true
    }
  ]
}
```

### С overlap separation

```json
{
  "segments": [
    {
      "start": 10.0,
      "end": 11.2,
      "speaker": "SPEAKER_01",
      "text": "Я думаю что...",
      "overlap": true,
      "is_sub_segment": true
    },
    {
      "start": 10.5,
      "end": 12.5,
      "speaker": "SPEAKER_02",
      "text": "Нет, подождите...",
      "overlap": true,
      "is_sub_segment": true,
      "overlap_confidence": 0.85
    }
  ]
}
```

## Ограничения

### Текущие ограничения

1. **Качество эмбеддингов**
   - Overlap сегменты часто имеют смешанные эмбеддинги
   - Разделение работает лучше при чётких голосах

2. **Количество спикеров**
   - Оптимально для 2-3 спикеров в overlap
   - При >3 спикерах качество снижается

3. **Длительность overlap**
   - Короткие overlap (<0.3с) сложно разделить
   - Длинные overlap (>5с) могут содержать несколько реплик

4. **Качество аудио**
   - Зашумлённое аудио ухудшает разделение
   - Эхо и реверберация создают ложные overlap

### Будущие улучшения

1. **Source Separation**
   - Использование ML моделей для разделения аудио источников
   - Например: Asteroid, SepFormer

2. **Multi-label Classification**
   - Предсказание нескольких спикеров одновременно
   - Вместо binary classification (один спикер)

3. **Attention-based Separation**
   - Использование attention механизмов
   - Фокусировка на отдельных спикерах

## Метрики качества

### Overlap Detection Rate (ODR)

```
ODR = Detected Overlaps / True Overlaps
```

- Целевое значение: >80%

### Overlap Separation Accuracy (OSA)

```
OSA = Correctly Separated Overlaps / Total Overlaps
```

- Целевое значение: >70%

### False Overlap Rate (FOR)

```
FOR = False Overlaps / Total Segments
```

- Целевое значение: <5%

## Сценарии настройки

### Сценарий 1: Активная дискуссия с частыми перебиваниями

```bash
OVERLAP_SEPARATION_ENABLED=true
OVERLAP_CONFIDENCE_THRESHOLD=0.65
MIN_OVERLAP_DURATION=0.3
OVERLAP_EMBEDDING_SIMILARITY=0.55
```

### Сценарий 2: Формальный диалог с редкими overlap

```bash
OVERLAP_SEPARATION_ENABLED=true
OVERLAP_CONFIDENCE_THRESHOLD=0.75
MIN_OVERLAP_DURATION=0.6
OVERLAP_EMBEDDING_SIMILARITY=0.65
```

### Сценарий 3: Конференц-звонок (3+ участников)

```bash
OVERLAP_SEPARATION_ENABLED=true
OVERLAP_CONFIDENCE_THRESHOLD=0.7
MIN_OVERLAP_DURATION=0.5
OVERLAP_EMBEDDING_SIMILARITY=0.6
```

### Сценарий 4: Зашумлённое аудио

```bash
OVERLAP_SEPARATION_ENABLED=true
OVERLAP_CONFIDENCE_THRESHOLD=0.8
MIN_OVERLAP_DURATION=0.7
OVERLAP_EMBEDDING_SIMILARITY=0.7
```

## Мониторинг

### Логи

```python
logger.info("Overlap processing completed", {
    "overlap_segments": 15,
    "sub_segments": 28,
    "overlap_percentage": "12.5%",
})
```

### Метрики через API

```bash
curl http://localhost:7860/api/metrics
```

Ответ:

```json
{
  "overlap_stats": {
    "total_segments": 120,
    "overlap_segments": 15,
    "sub_segments": 28,
    "overlap_percentage": 12.5,
    "overlap_time_percentage": 8.3
  }
}
```

## Тестирование

### Тестовый звонок с overlap

```bash
# Загрузите тестовый файл с перебиваниями
curl -X POST http://localhost:7860/api/transcribe \
  -F "file=@test_overlap.wav" \
  -F "preprocess_metadata_json={}"
```

### Проверка результатов

```python
# Проверьте наличие sub_segments
result = response.json()
sub_segments = [s for s in result["segments"] if s.get("is_sub_segment")]
print(f"Detected {len(sub_segments)} sub-segments in overlaps")
```

## Источники

Overlap separation основан на современных исследованиях:

- [Multi-speaker ASR (2024)](https://arxiv.org/html/2506.05796v1)
- [Overlap-aware Diarization](https://arxiv.org/html/2410.06459v2)
- [EEND with Overlap Detection](https://arxiv.org/html/2510.14551v1)

## Заключение

Система поддерживает распознавание одновременной речи через:

1. ✅ Детекцию overlap регионов (preprocessing + temporal)
2. ✅ Анализ эмбеддингов в overlap
3. ✅ Разделение на sub-segments для каждого спикера
4. ✅ Настраиваемые параметры для разных сценариев

**Ограничения:** Качество зависит от чёткости голосов и качества аудио. Для лучших результатов используйте audio preprocessing.
