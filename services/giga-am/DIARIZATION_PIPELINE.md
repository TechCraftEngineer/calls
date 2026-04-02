# Speaker Diarization Pipeline

## Архитектура (SOTA 2024-2026)

```
Аудио → Pyannote Diarization → Сегменты по спикерам → GigaAM ASR → Транскрипция
```

**Преимущества:**
- ✅ Определяет границы спикеров по голосу, а не по паузам
- ✅ Работает даже когда спикеры говорят подряд без пауз
- ✅ DER ~11-19% (профессиональный уровень)
- ✅ Используется в production: HuggingFace, Rev.ai, AWS и др.

**Этапы:**
1. **Diarization** - pyannote определяет "кто когда говорил"
2. **ASR** - GigaAM транскрибирует каждый сегмент
3. **Alignment** - выравнивание слов
4. **Postprocessing** - финальная обработка

## Настройки (.env)

```bash
# Pyannote diarization (обязательно)
HF_TOKEN=your_huggingface_token
PYANNOTE_DIARIZATION_MODEL=pyannote/speaker-diarization-3.1

# Параметры диаризации
DIARIZATION_NUM_SPEAKERS=  # Точное количество (если известно)
DIARIZATION_MIN_SPEAKERS=  # Минимум спикеров
DIARIZATION_MAX_SPEAKERS=  # Максимум спикеров
DIARIZATION_MIN_SEGMENT_DURATION=0.5  # Минимальная длительность сегмента (сек)

# Автоматический апсемплинг аудио
AUTO_RESAMPLE_ENABLED=true
TARGET_SAMPLE_RATE=16000
```

## Получение HF_TOKEN

1. Зарегистрируйтесь на https://huggingface.co
2. Создайте токен: https://huggingface.co/settings/tokens
3. Примите условия: https://huggingface.co/pyannote/speaker-diarization-3.1

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

```
[request_id] Используется SOTA pipeline: Pyannote Diarization → GigaAM ASR
[request_id] Diarization создал N сегментов для транскрипции
[request_id] ASR завершён: M сегментов из N diarization сегментов
```

## Troubleshooting

**Pyannote не загружается:**
- Проверьте HF_TOKEN в .env
- Примите условия на https://huggingface.co/pyannote/speaker-diarization-3.1
- Проверьте логи: `Pyannote diarization pipeline загружен`

**Плохое качество диаризации:**
- Используйте аудио ≥16kHz (автоматический апсемплинг включен)
- Укажите количество спикеров если известно: `DIARIZATION_NUM_SPEAKERS=2`
- Проверьте качество аудио (шум, эхо)

**Ошибка "Pyannote diarization недоступен":**
- Установите HF_TOKEN в .env
- Перезапустите сервис: `docker-compose restart giga-am`
- Проверьте что токен валиден и условия приняты
