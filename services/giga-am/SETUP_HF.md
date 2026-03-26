# Настройка HuggingFace Space

## Быстрый старт

### 1. Получите токен HuggingFace

1. Перейдите на https://huggingface.co/settings/tokens
2. Создайте новый токен с правами `read`
3. Скопируйте токен

### 2. Примите условия доступа к модели

Перейдите на страницу модели и примите условия:
https://huggingface.co/pyannote/segmentation-3.0

### 3. Добавьте токен в Space

1. Откройте настройки вашего Space
2. Перейдите в раздел "Repository secrets"
3. Добавьте новый секрет:
   - Name: `HF_TOKEN`
   - Value: ваш токен из шага 1
4. Space автоматически перезапустится

### 4. Проверьте работу API

```bash
# Проверка статуса
curl https://your-space.hf.space/api/health

# Тест распознавания
curl -X POST "https://your-space.hf.space/api/transcribe" \
  -F "file=@audio.mp3"
```

## API Эндпоинты

- `GET /` - Информация об API
- `GET /api/health` - Проверка работоспособности
- `GET /api/info` - Информация о приложении
- `POST /api/transcribe` - Распознавание речи из аудиофайла
- `GET /docs` - Swagger документация

## Поддерживаемые форматы

MP3, WAV, FLAC, M4A, AAC, OGG, WEBM

## Ограничения

- Максимальный размер файла: 100MB
- Hardware: CPU Basic (можно улучшить в настройках Space)
