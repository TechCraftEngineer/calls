# Quick Start: Dual ASR + LLM Correction

Быстрый старт для запуска Dual ASR + LLM коррекции через Inngest.

## Шаг 1: Настройка GigaAM

```bash
cd services/giga-am

# Скопируйте .env.example
cp .env.example .env

# Отредактируйте .env
nano .env
```

Минимальные настройки:

```bash
# Remote diarization
SPEAKER_EMBEDDINGS_URL=http://speaker-embeddings:7860

# Dual ASR + LLM
ENABLE_DUAL_ASR_LLM_CORRECTION=true
INNGEST_API_URL=http://localhost:3001
DUAL_ASR_LLM_API_URL=https://api.openai.com/v1
DUAL_ASR_LLM_API_KEY=sk-your-openai-key
DUAL_ASR_LLM_MODEL=gpt-4o-mini
```

## Шаг 2: Настройка Speaker Embeddings

```bash
cd services/speaker-embeddings

# Создайте .env
echo "HF_TOKEN=your-huggingface-token" > .env
echo "PORT=7860" >> .env
```

Получите HF_TOKEN:
1. https://huggingface.co/settings/tokens
2. Примите условия: https://huggingface.co/pyannote/speaker-diarization-community-1

## Шаг 3: Запуск сервисов

```bash
# Из корня проекта
docker-compose up -d giga-am speaker-embeddings

# Проверка логов
docker-compose logs -f giga-am
docker-compose logs -f speaker-embeddings
```

## Шаг 4: Запуск Inngest

Inngest уже должен быть запущен в `packages/jobs`:

```bash
# Проверка
curl http://localhost:3001/health

# Если не запущен
cd packages/jobs
npm run dev
```

## Шаг 5: Тестирование

```bash
cd services/giga-am

# Запустите тестовый скрипт
./test_diarization.sh test_demo.mp3
```

## Проверка работы Dual ASR

### 1. Проверьте логи GigaAM

Должны быть строки:

```
[request-id] Dual ASR mode: выполняем полную транскрипцию для контекста
[request-id] Полная транскрипция завершена за X.XXs
[request-id] Отправляем запрос на LLM коррекцию в Inngest
[request-id] Запрос на LLM коррекцию отправлен в Inngest
```

### 2. Проверьте Inngest Dashboard

Откройте: http://localhost:3001

Должна быть функция `dual-asr-llm-correction` и выполненные runs.

### 3. Проверьте результат

```bash
curl -X POST http://localhost:7860/api/transcribe \
  -F "file=@test_demo.mp3" \
  | jq '.segments[] | {speaker, text}'
```

## Отключение Dual ASR

Если нужна только стандартная диаризация:

```bash
# В .env
ENABLE_DUAL_ASR_LLM_CORRECTION=false
```

Перезапустите:

```bash
docker-compose restart giga-am
```

## Troubleshooting

### Ошибка: "Inngest API URL not configured"

Проверьте `.env`:
```bash
INNGEST_API_URL=http://localhost:3001
```

### Ошибка: "Failed to send Inngest event"

Проверьте что Inngest запущен:
```bash
curl http://localhost:3001/health
```

### LLM коррекция не выполняется

1. Проверьте Inngest Dashboard
2. Проверьте LLM API ключ
3. Проверьте логи Inngest:
   ```bash
   cd packages/jobs
   npm run dev
   ```

### Pyannote не загружается

1. Проверьте HF_TOKEN в speaker-embeddings
2. Примите условия на HuggingFace
3. Перезапустите:
   ```bash
   docker-compose restart speaker-embeddings
   ```

## Стоимость

Примерная стоимость на gpt-4o-mini:
- 1 минута аудио ≈ $0.0001-0.0003
- 1 час аудио ≈ $0.006-0.018

Для экономии можно:
1. Отключить Dual ASR для простых случаев
2. Использовать более дешёвую модель
3. Кэшировать результаты

## Следующие шаги

1. Настройте webhook для получения исправленных сегментов
2. Добавьте мониторинг в Inngest Dashboard
3. Настройте алерты на ошибки LLM
4. Оптимизируйте промпт для вашего домена

## Документация

- [DUAL_ASR_LLM_CORRECTION.md](./DUAL_ASR_LLM_CORRECTION.md) - Полная документация
- [DIARIZATION_PIPELINE.md](./DIARIZATION_PIPELINE.md) - Общая архитектура
- [packages/jobs/src/inngest/functions/dual-asr-llm-correction.ts](../../packages/jobs/src/inngest/functions/dual-asr-llm-correction.ts) - Код Inngest функции
