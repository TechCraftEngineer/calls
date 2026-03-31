# 🎵 Audio Enhancer - Примеры использования

## 📋 Новые режимы обработки

Сервис теперь поддерживает 3 режима агрессивности обработки:

### 🌿 **Light Mode** (Рекомендуется для качественных записей)
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=light" \
  -F "target_sample_rate=16000"
```

**Что включено:**
- ✅ DeepFilterNet шумоподавление
- ✅ Усиление речевых частот
- ✅ LUFS нормализация
- ❌ WPE (может искажать речь)
- ❌ Компрессия
- ❌ Спектральный гейтинг

### 🔧 **Medium Mode** (Сбалансированный режим - по умолчанию)
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=medium" \
  -F "target_sample_rate=16000"
```

**Что включено:**
- ✅ DeepFilterNet шумоподавление
- ✅ Усиление речевых частот
- ✅ LUFS нормализация
- ✅ Спектральный гейтинг (консервативный)
- ❌ WPE
- ❌ Компрессия

### ⚡ **Heavy Mode** (Для плохих записей с сильным шумом)
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=heavy" \
  -F "target_sample_rate=16000"
```

**Что включено:**
- ✅ DeepFilterNet шумоподавление
- ✅ WPE дереверберация
- ✅ Классическое шумоподавление
- ✅ Усиление речевых частот
- ✅ Мягкая компрессия
- ✅ Спектральный гейтинг
- ✅ LUFS нормализация

## 🎛️ Кастомные настройки

Можно комбинировать режимы с ручными настройками:

```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=light" \
  -F "use_compressor=true" \
  -F "remove_silence=true" \
  -F "target_sample_rate=16000"
```

## 📊 Улучшения качества

### 🔧 **Улучшенные параметры:**

**Компрессия:**
- Было: threshold=-20dB, ratio=4:1 (агрессивная)
- Стало: threshold=-16dB, ratio=2:1 (мягкая)

**Усиление речи:**
- Было: critical_gain=1.5x, speech_gain=1.3x
- Стало: critical_gain=1.2x, speech_gain=1.1x

**Спектральный гейтинг:**
- Было: percentile=10%, min_mask=0
- Стало: percentile=5%, min_mask=0.3

### 🎯 **Результат:**
- ✅ Меньше искажений тембра
- ✅ Естественное звучание речи
- ✅ Сохранение полезных частот
- ✅ Гибкие настройки под разные типы записей

## 🔍 Рекомендации по выбору режима

| Тип записи | Рекомендуемый режим | Причина |
|-----------|-------------------|---------|
| Качественная запись в тихом помещении | **Light** | Минимальная обработка |
| Запись с офисным фоном | **Medium** | Баланс шумоподавления |
| Запись на улице / в транспорте | **Heavy** | Максимальное шумоподавление |
| Запись с реверберацией | **Heavy** | WPE удалит эхо |
| Запись для ASR распознавания | **Medium** | Оптимально для речи |

## 🚀 Быстрый тест

```python
import requests

# Тест light режима
with open("test.wav", "rb") as f:
    response = requests.post(
        "http://localhost:7860/enhance",
        files={"file": f},
        data={"aggressiveness": "light"}
    )
    
with open("enhanced_light.wav", "wb") as f:
    f.write(response.content)
```

## 📝 Логирование

Сервис логирует применяемые настройки:
```
INFO: Режим обработки: light
INFO: Применяем DeepFilterNet шумоподавление...
INFO: ✓ DeepFilterNet применен
INFO: Усиливаем речевые частоты...
INFO: Нормализуем громкость (LUFS)...
```

Это помогает отладить и выбрать оптимальные настройки для ваших записей.
