# 📞 Audio Enhancer - Адаптация под телефонию

## 🎯 Новые возможности для обработки телефонных звонков

### ✅ Что добавлено:

1. **Поддержка телефонных кодеков**:
   - G.711 (A-law/μ-law) - стандарт для телефонии
   - G.729 - компрессия для речи
   - Opus - современный кодек для IP-телефонии
   - WAV - стандартный формат

2. **Обработка дуплексного аудио**:
   - Разделение caller/callee каналов
   - Независимая обработка каждого канала
   - Сохранение метаданных для каждого участника

3. **Телефонные фильтры**:
   - Band-pass фильтр 300Hz-3400Hz (стандарт телефонии)
   - Подавление эха (эхо-компенсация)
   - Нормализация уровня для телефонных линий
   - Удаление низкочастотных шумов линии

4. **Интеграция с существующими моделями**:
   - DeepFilterNet для шумоподавления
   - LUFS нормализация громкости
   - Ресемплинг до стандартных частот

## 🚀 Новые API эндпоинты:

### `/telephony/enhance`
Полная обработка телефонного аудио с улучшением качества.

```bash
curl -X POST "http://localhost:7860/telephony/enhance" \
  -F "file=@call.g711" \
  -F "format_type=g711" \
  -F "duplex=true" \
  -F "apply_telephony_filters=true" \
  -F "target_sample_rate=16000" \
  -o enhanced_call.json
```

**Параметры:**
- `file`: Аудио файл
- `format_type`: 'auto', 'g711', 'g729', 'opus', 'wav'
- `duplex`: Дуплексное аудио (два канала)
- `apply_telephony_filters`: Применять телефонные фильтры
- `target_sample_rate`: Целевая частота (800-48000 Гц)

### `/telephony/convert`
Конвертация телефонного формата в стандартный.

```bash
curl -X POST "http://localhost:7860/telephony/convert" \
  -F "file=@call.opus" \
  -F "from_format=opus" \
  -F "to_format=wav" \
  -F "sample_rate=16000" \
  -o converted_call.wav
```

### `/telephony/split`
Разделение дуплексного аудио на два канала.

```bash
curl -X POST "http://localhost:7860/telephony/split" \
  -F "file=@stereo_call.wav" \
  -F "format_type=wav" \
  -o split_channels.json
```

## 📋 Примеры использования:

### Python
```python
import requests

# Обработка телефонного звонка
with open("call.g711", "rb") as f:
    response = requests.post(
        "http://localhost:7860/telephony/enhance",
        files={"file": f},
        data={
            "format_type": "g711",
            "duplex": True,
            "apply_telephony_filters": True,
            "target_sample_rate": 16000
        }
    )
    
result = response.json()
print(f"Обработано каналов: {len(result['channels'])}")
```

### JavaScript
```javascript
const formData = new FormData();
formData.append("file", audioFile);
formData.append("format_type", "g711");
formData.append("duplex", "true");
formData.append("apply_telephony_filters", "true");

const response = await fetch("http://localhost:7860/telephony/enhance", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log("Enhanced channels:", Object.keys(result.channels));
```

## 🔧 Технические особенности:

### Частота дискретизации
- **Телефония**: 8kHz (стандарт)
- **Обработка**: 16kHz (улучшение качества для ASR)
- **Гибкость**: 8kHz - 48kHz

### Кодеки
- **G.711**: 64kbps, стандарт аналоговых телефонных систем
- **G.729**: 8kbps, компрессия речи
- **Opus**: 6-510kbps, современный IP-телефонии
- **WAV**: Без потерь, максимальное качество

### Фильтры
- **Band-pass**: 300-3400Hz (полоса пропускания телефонии)
- **Echo cancellation**: 100ms задержка, адаптивное подавление
- **Level normalization**: RMS нормализация для телефонных уровней

## 📊 Ответы API:

### `/telephony/enhance` ответ:
```json
{
  "channels": {
    "caller": "base64_encoded_audio",
    "callee": "base64_encoded_audio"
  },
  "metadata": {
    "original_format": "g711",
    "duplex": true,
    "sample_rate": 16000,
    "duration": 45.2,
    "telephony_filters_applied": true
  }
}
```

### `/telephony/split` ответ:
```json
{
  "caller": {
    "audio": "base64_encoded_audio",
    "sample_rate": 16000,
    "duration": 45.2
  },
  "callee": {
    "audio": "base64_encoded_audio", 
    "sample_rate": 16000,
    "duration": 45.2
  },
  "metadata": {
    "original_format": "wav",
    "channels_separated": true
  }
}
```

## 🏥 Health Check:
Обновленный `/health` эндпоинт теперь включает:
```json
{
  "status": "healthy",
  "telephony_available": true,
  "telephony_endpoints_available": true,
  "version": "2.0.0"
}
```

## 📦 Установка новых зависимостей:
```bash
pip install pyaudio webrtcvad opuslib
```

## 🚀 Запуск:
```bash
cd services/audio-enhancer
docker-compose up --build
```

Audio Enhancer теперь полностью готов для обработки телефонных звонков! 🎯
