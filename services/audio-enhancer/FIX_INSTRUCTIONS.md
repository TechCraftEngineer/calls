# Исправление проблем Audio Enhancer сервиса

## Проблемы и решения

### 1. Предупреждение torchaudio об устаревшем импорте

**Проблема:**
```
/usr/local/lib/python3.12/site-packages/df/io.py:9: UserWarning: `torchaudio.backend.common.AudioMetaData` has been moved to `torchaudio.AudioMetaData`. Please update the import path.
```

**Решение:** ✅ Уже исправлено
- Добавлен фильтр предупреждений в `main.py`
- Предупреждение подавляется и не влияет на работу

### 2. Ошибка Pyannote с параметром token

**Проблема:**
```
Не удалось загрузить Pyannote: Pipeline.from_pretrained() got an unexpected keyword argument 'token'
```

**Решение:** ✅ Уже исправлено
- Добавлена совместимость с разными версиями Pyannote API
- Сначала пробуется старый API (`use_auth_token`), затем новый (`token`)

## Быстрый запуск

### 1. Диагностика и автоматическое исправление

```bash
cd services/audio-enhancer
python fix_audio_service.py
```

Скрипт проверит:
- Версию Python (требуется 3.8+)
- Установленные зависимости
- Наличие HF токена
- Совместимость версий

### 2. Установка зависимостей

```bash
# Если есть проблемы с зависимостями
pip install -r requirements.txt
```

### 3. Настройка HF токена

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:
```env
HF_TOKEN=your_actual_huggingface_token
```

Получить токен: https://huggingface.co/settings/tokens

### 4. Запуск сервиса

```bash
python main.py
```

## Проверка работоспособности

### Health endpoint
```bash
curl http://localhost:7860/health
```

### Документация API
Откройте в браузере: http://localhost:7860/docs

## Версии зависимостей

Исправленные версии в `requirements.txt`:
- `pyannote.audio>=3.0.0,<3.2.0` - ограничение для совместимости
- `torch>=2.0.0,<2.6.0` - совместимая версия PyTorch
- `torchaudio>=2.0.0,<2.6.0` - соответствующая версия TorchAudio

## Если проблемы остались

1. **Полная переустановка:**
```bash
# Удалить кеш pip
pip cache purge

# Установить в чистом окружении
pip install -r requirements.txt --no-cache-dir
```

2. **Проверка совместимости:**
```bash
python -c "import torch; print(torch.__version__)"
python -c "import pyannote.audio; print(pyannote.audio.__version__)"
```

3. **Альтернативный запуск без диаризации:**
Если Pyannote не работает, сервис будет работать без диаризации:
```bash
export HF_TOKEN=""
python main.py
```

## Логирование

Сервис логирует все проблемы при запуске:
- ✅ Успешная загрузка моделей
- ⚠️ Предупреждения о недоступных функциях
- ❌ Критические ошибки

Уровень логирования можно изменить в `.env`:
```env
LOG_LEVEL=DEBUG  # для детальной отладки
```
