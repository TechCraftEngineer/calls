# Diarization Architecture Refactor

## Overview

Рефакторинг архитектуры диаризации для разделения ответственности между сервисами.

## Problem

**Previous Architecture:**
```text
GigaAM Service:
├── ASR (транскрипция) ✓
├── Diarization (pyannote) ❌
├── Alignment ❌
├── Attribution ❌
└── Postprocessing ❌
```

Проблема: GigaAM пытался делать всё - и транскрипцию, и диаризацию, что нарушало принцип единственной ответственности.

## Solution

**New Architecture:**
```text
Inngest (оркестратор)
├── Speaker-embeddings Service (диаризация)
│   └── pyannote SOTA 2024-2026
├── GigaAM Service (транскрипция)
│   └── Только русская речь
└── LLM Merge
    └── Объединение результатов
```

## Changes Made

### 1. GigaAM Service Cleanup

**Removed Files:**
- `services/diarization_service.py` ❌
- `services/alignment_service.py` ❌
- `services/attribution_service.py` ❌
- `services/postprocess_service.py` ❌
- `services/audio_preprocessing.py` ❌

**Updated Files:**
- `services/pipeline_service.py` - только транскрипция
- `routes/transcribe_sync.py` - убран параметр diarization
- `config.py` - убраны настройки диаризации

### 2. Inngest Enhancement

**New Files:**
- `speaker-diarization.ts` - работа с speaker-embeddings
- Обновленные helpers.ts с новой логикой

**Updated Files:**
- `main.ts` - новая архитектура обработки
- `helpers.ts` - функции для работы с диаризацией
- `env.ts` - добавлена SPEAKER_EMBEDDINGS_URL

### 3. Configuration

**Environment Variables:**
```bash
# Новая переменная
SPEAKER_EMBEDDINGS_URL=https://your-space.hf.space

# Существующие (без изменений)
GIGA_AM_TRANSCRIBE_URL=https://vnggncb-giga-am.hf.space/api/transcribe-sync
```

## New Processing Flow

```typescript
// 1. Диаризация через speaker-embeddings
const diarizationResult = await performDiarization(audioBuffer, filename);

// 2. Транскрипция каждого сегмента через GigaAM
for (const segment of diarizationResult.segments) {
  const segmentAudio = await extractAudioSegment(audioBuffer, segment.start, segment.end);
  const transcript = await processAudioWithoutDiarization(segmentAudio, filename);
  // Добавляем speaker: segment.speaker
}

// 3. LLM Merge результатов
const mergedResult = await applyLLMMerging(nonDiarized, diarized, callId);
```

## Benefits

1. **Separation of Concerns**: Каждый сервис отвечает только за свою задачу
2. **Scalability**: speaker-embeddings можно развернуть отдельно
3. **SOTA Technologies**: pyannote для диаризации, GigaAM для русской речи
4. **Fallback Mechanism**: Если диаризация не удалась, используется обычная транскрипция
5. **Maintainability**: Чистая архитектура с понятными границами

## TODO

1. **Audio Segmentation**: Реализация извлечения аудио сегментов
   - ✅ Установлена библиотека: ffmpeg через child_process spawn
   - ✅ Реализовано в `packages/jobs/src/inngest/functions/transcribe-call/audio/processing.ts`
   - Функция `extractAudioSegment()` использует ffmpeg для точного извлечения сегментов

2. **Error Handling**: Улучшить обработку ошибок speaker-embeddings
   - Добавлена Zod валидация ответов в speaker-diarization.ts
   - Добавлен graceful fallback при ошибках диаризации

3. **Performance**: Оптимизировать передачу аудио между сервисами
   - Потоковая загрузка аудио с проверкой размера в download.ts
   - Уникальные временные каталоги для параллельной обработки

## Deployment

### Docker Compose
```yaml
services:
  # GigaAM - только транскрипция
  giga-am:
    build: ./services/giga-am
    environment:
      - GIGA_AM_TRANSCRIBE_URL=${GIGA_AM_TRANSCRIBE_URL}
  
  # Speaker-embeddings - только диаризация  
  speaker-embeddings:
    build: ./services/speaker-embeddings
    environment:
      - HF_TOKEN=${HF_TOKEN}
```

### Environment Setup
```bash
# .env
SPEAKER_EMBEDDINGS_URL=https://vnggncb-speaker-embeddings.hf.space
GIGA_AM_TRANSCRIBE_URL=https://vnggncb-giga-am.hf.space/api/transcribe-sync
```

## Testing

```bash
# Тест диаризации
curl -X POST https://your-space.hf.space/api/diarize \
  -F "file=@audio.wav" \
  -F "num_speakers=2"

# Транскрипция через GigaAM
curl -X POST https://vnggncb-giga-am.hf.space/api/transcribe-sync \
  -F "file=@audio.wav" \
  -F "filename=test.wav"
```

## Migration Guide

1. **Deploy speaker-embeddings service**
2. **Update environment variables**
3. **Restart GigaAM service**
4. **Test new architecture**

Результат: Чистая архитектура с разделением ответственности и SOTA технологиями.
