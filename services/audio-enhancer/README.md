---
title: Audio Enhancer
emoji: 🎵
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# Audio Enhancer - Улучшение качества аудио

Микросервис для продвинутой обработки аудио с шумоподавлением и улучшением качества речи.

## Возможности

- 🔇 Шумоподавление (noisereduce)
- 📢 Нормализация громкости
- 🎙️ Усиление речевых частот (300-3400 Hz)
- ⏸️ Удаление длинных пауз (Silero VAD)
- 🔄 Ресемплинг аудио
- 📁 Поддержка форматов: MP3, WAV, FLAC, M4A, AAC, OGG, WEBM
- 🚀 Работа полностью в памяти (без временных файлов)
- 🔒 Защита от OOM с лимитами размера

## Быстрый старт

### Docker (рекомендуется)

```bash
docker build -t audio-enhancer .
docker run -p 8080:8080 audio-enhancer
```

### Локальная установка

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## API Эндпоинты

### POST /enhance

Полная обработка аудио с настраиваемыми параметрами.

```bash
curl -X POST "http://localhost:8080/enhance" \
  -F "file=@audio.mp3" \
  -F "noise_reduction=true" \
  -F "normalize_volume=true" \
  -F "enhance_speech=true" \
  -F "remove_silence=true" \
  -F "target_sample_rate=16000"
```

**Параметры:**
- `file` - аудио файл (обязательно)
- `noise_reduction` - шумоподавление (default: true)
- `normalize_volume` - нормализация громкости (default: true)
- `enhance_speech` - усиление речевых частот (default: true)
- `remove_silence` - удаление пауз (default: false)
- `target_sample_rate` - целевая частота 800-192000 Hz (default: 16000)

### POST /denoise

Быстрое шумоподавление без дополнительной обработки.

```bash
curl -X POST "http://localhost:8080/denoise" \
  -F "file=@audio.mp3" \
  -F "stationary=true" \
  -F "prop_decrease=0.8"
```

**Параметры:**
- `file` - аудио файл (обязательно)
- `stationary` - стационарный шум (default: true)
- `prop_decrease` - агрессивность 0-1 (default: 0.8)

### GET /health

Проверка работоспособности сервиса.

```bash
curl http://localhost:8080/health
```

## Ограничения

- Максимальный размер файла: 80MB
- Максимальная длительность: 4 часа
- Выходной формат: WAV 16-bit PCM

## Технологии

- FastAPI - REST API
- librosa - загрузка и обработка аудио
- noisereduce - шумоподавление
- Silero VAD - детекция речи
- soundfile - сохранение аудио
- PyTorch - модель VAD

## Примеры использования

### Python

```python
import requests

with open("audio.mp3", "rb") as f:
    response = requests.post(
        "http://localhost:8080/enhance",
        files={"file": f},
        data={
            "noise_reduction": True,
            "normalize_volume": True,
            "enhance_speech": True,
            "remove_silence": True,
            "target_sample_rate": 16000,
        }
    )

with open("enhanced.wav", "wb") as f:
    f.write(response.content)
```

### cURL

```bash
# Полная обработка
curl -X POST "http://localhost:8080/enhance" \
  -F "file=@noisy_audio.mp3" \
  -F "noise_reduction=true" \
  -F "normalize_volume=true" \
  -F "enhance_speech=true" \
  -F "remove_silence=true" \
  -o enhanced.wav

# Только шумоподавление
curl -X POST "http://localhost:8080/denoise" \
  -F "file=@noisy_audio.mp3" \
  -F "prop_decrease=0.9" \
  -o denoised.wav
```

## Структура проекта

```
audio-enhancer/
├── main.py              # FastAPI приложение
├── requirements.txt     # Зависимости
├── Dockerfile          # Docker конфигурация
└── README.md           # Документация
```

## Ссылки

- [noisereduce](https://github.com/timsainb/noisereduce)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [librosa](https://librosa.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
