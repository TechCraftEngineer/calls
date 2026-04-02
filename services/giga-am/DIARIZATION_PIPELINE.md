# Speaker Diarization Pipeline

## Архитектура (SOTA 2024-2026)

```
Аудио → Remote Diarization Service (Pyannote) → Сегменты по спикерам → GigaAM ASR → Транскрипция
```

**Преимущества:**

- ✅ Определяет границы спикеров по голосу, а не по паузам
- ✅ Работает даже когда спикеры говорят подряд без пауз
- ✅ DER ~11-19% (профессиональный уровень)
- ✅ Используется в production: HuggingFace, Rev.ai, AWS и др.
- ✅ Централизованный сервис диаризации (разгружает giga-am)

**Этапы:**

1. **Diarization** (remote) - pyannote определяет "кто когда говорил"
2. **ASR** (giga-am) - GigaAM транскрибирует каждый сегмент
3. **Alignment** - выравнивание слов
4. **Postprocessing** - финальная обработка

## Настройки

### GigaAM (.env)

```bash
# Remote diarization service
SPEAKER_EMBEDDINGS_URL=http://speaker-embeddings:7860
SPEAKER_EMBEDDINGS_TIMEOUT=120

# Параметры диаризации
DIARIZATION_NUM_SPEAKERS=  # Точное количество (если известно)
DIARIZATION_MIN_SPEAKERS=  # Минимум спикеров
DIARIZATION_MAX_SPEAKERS=  # Максимум спикеров
DIARIZATION_MIN_SEGMENT_DURATION=0.5  # Минимальная длительность сегмента (сек)

# Автоматический апсемплинг аудио
AUTO_RESAMPLE_ENABLED=true
TARGET_SAMPLE_RATE=16000
```

### Speaker-Embeddings (.env)

```bash
# Pyannote models
HF_TOKEN=your_huggingface_token
PYANNOTE_MODEL=pyannote/embedding
PYANNOTE_DIARIZATION_MODEL=pyannote/speaker-diarization-3.1
ENABLE_PYANNOTE=1

# Server
PORT=7860
```

## Получение HF_TOKEN

1. Зарегистрируйтесь на <https://huggingface.co>
2. Создайте токен: <https://huggingface.co/settings/tokens>
3. Примите условия:
   - <https://huggingface.co/pyannote/speaker-diarization-3.1>
   - <https://huggingface.co/pyannote/embedding>

## Качество

**Pyannote 3.1:**

- DER (Diarization Error Rate): 11-19% на стандартных бенчмарках
- SOTA open-source решение 2024-2026
- Используется в production у крупных компаний

**Источники:**

- [HuggingFace Blog](https://huggingface.co/blog/asr-diarization)
- [BrassTranscripts Comparison 2026](https://brasstranscripts.com/blog/speaker-diarization-models-comparison)
- [Pyannote.ai](https://www.pyannote.ai/)

## Логи

**GigaAM:**

```
Remote diarization service доступен: http://speaker-embeddings:7860
[request_id] Используется SOTA pipeline: Pyannote Diarization → GigaAM ASR
[request_id] Запрос diarization к remote service: audio_duration=49.10s
Remote diarization завершена: 5 сегментов, 2 спикеров
[request_id] ASR завершён: 12 сегментов из 5 diarization сегментов
```

**Speaker-Embeddings:**

```
Pyannote diarization pipeline загружен: pyannote/speaker-diarization-3.1
Starting diarization: duration=49.10s, params={'num_speakers': 2}
Diarization completed: 5 segments, 2 speakers, total_speech=45.30s
```

## Troubleshooting

**Remote service недоступен:**

- Проверьте что speaker-embeddings запущен: `docker ps | grep speaker`
- Проверьте SPEAKER_EMBEDDINGS_URL в giga-am/.env
- Проверьте логи: `docker logs speaker-embeddings`

**Pyannote не загружается на remote:**

- Проверьте HF_TOKEN в speaker-embeddings/.env
- Примите условия на <https://huggingface.co/pyannote/speaker-diarization-3.1>
- Перезапустите: `docker-compose restart speaker-embeddings`

**Плохое качество диаризации:**

- Используйте аудио ≥16kHz (автоматический апсемплинг включен)
- Укажите количество спикеров: `DIARIZATION_NUM_SPEAKERS=2`
- Проверьте качество аудио (шум, эхо)

**Timeout при диаризации:**

- Увеличьте SPEAKER_EMBEDDINGS_TIMEOUT (по умолчанию 60s)
- Для длинных аудио (>5 минут) установите 120-180s
