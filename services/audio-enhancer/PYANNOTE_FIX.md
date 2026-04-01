# Исправление ошибки Pyannote с use_auth_token

## Проблема

Ошибка при загрузке Pyannote:
```
WARNING - Не удалось загрузить Pyannote: hf_hub_download() got an unexpected keyword argument 'use_auth_token'
```

## Причина

Параметр `use_auth_token` был **удален** в huggingface_hub v1.0.0. Теперь нужно использовать параметр `token`.

## Решение

### 1. Обновить зависимости

```bash
cd services/audio-enhancer
pip install --upgrade huggingface_hub>=0.20.0
pip install --upgrade pyannote.audio>=3.1.0
```

Или установить все зависимости:
```bash
pip install -r requirements.txt
```

### 2. Убедиться, что HF_TOKEN установлен

```bash
# В PowerShell
$env:HF_TOKEN = "your_huggingface_token"

# В Linux/macOS
export HF_TOKEN="your_huggingface_token"
```

Или добавить в .env файл:
```
HF_TOKEN=your_huggingface_token
```

### 3. Проверить версию huggingface_hub

```bash
pip show huggingface_hub
```

Версия должна быть >= 0.20.0

## Что было исправлено в коде

1. **utils/pyannote_utils.py** - заменен `use_auth_token` на `token`
2. **requirements.txt** - обновлены версии зависимостей
3. **Добавлена проверка ошибок** для несовместимых версий

## Минимальные требования

- huggingface_hub >= 0.20.0
- pyannote.audio >= 3.1.0
- Установленный HF_TOKEN

После этих изменений ошибка должна исчезнуть.
