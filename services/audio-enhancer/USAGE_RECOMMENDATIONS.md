# Рекомендации по использованию Audio Enhancer

## Проблема: Ухудшение качества аудио после обработки

### Обновленные настройки (v2.1)

Конфигурация была изменена для минимизации искажений аудио:

#### 1. **Консервативные параметры по умолчанию**
- **Режим по умолчанию**: `light` (вместо `medium`)
- **Усиление речи**: отключено по умолчанию
- **Спектральный гейтинг**: отключен по умолчанию
- **Только DeepFilterNet + LUFS нормализация**

#### 2. **Новые режимы обработки**

```json
{
  "light": {
    "use_deepfilter": true,
    "enhance_speech": false,
    "spectral_gating": false,
    "use_compressor": false
  },
  "medium": {
    "use_deepfilter": true,
    "enhance_speech": true,
    "spectral_gating": false,
    "use_compressor": false
  },
  "heavy": {
    "use_deepfilter": true,
    "enhance_speech": true,
    "spectral_gating": true,
    "use_compressor": true,
    "use_wpe": true
  }
}
```

#### 3. **Улучшенные параметры фильтров**

**Фильтры речи (минимальные вмешательства):**
- Усиление речи: 1.05x (было 1.1x)
- Критическое усиление: 1.1x (было 1.2x)
- Подавление не-речи: 0.9x (было 0.7x)

**Спектральный гейтинг (консервативный):**
- Порог шума: 15% (было 5%)
- Степень маски: 1.2 (было 1.5)
- Минимальная маска: 0.5 (было 0.3)

## Рекомендации по использованию

### Для большинства записей:
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=light"
```

### Для зашумленных записей:
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=medium"
```

### Для очень плохих записей:
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "aggressiveness=heavy"
```

### Только шумоподавление (без искажений):
```bash
curl -X POST "http://localhost:7860/enhance" \
  -F "file=@audio.wav" \
  -F "use_deepfilter=true" \
  -F "enhance_speech=false" \
  -F "spectral_gating=false" \
  -F "use_compressor=false" \
  -F "normalize_volume=true"
```

## Что было изменено

1. **Отключены агрессивные обработки по умолчанию**
2. **Добавлена безопасная обработка ошибок** - если какой-то этап не удастся, он пропускается
3. **Уменьшены коэффициенты усиления** для минимизации искажений
4. **Изменены пороги спектрального гейтинга** для более мягкой очистки

## Результат

- **Light режим**: Только шумоподавление + нормализация громкости
- **Medium режим**: + усиление речевых частот
- **Heavy режим**: + спектральный гейтинг + компрессия + WPE

Это должно решить проблему ухудшения качества аудио при обработке.
