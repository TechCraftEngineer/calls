# GigaAM + Speaker-Embeddings Architecture

## Overview

Новая архитектура разделения диаризации и транскрипции на отдельные сервисы.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Inngest     │───▶│ Speaker-embeddings │───▶│     GigaAM      │
│  (оркестратор) │    │   (диаризация)   │    │  (транскрипция)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                         ┌─────────────────┐
                         │   LLM Merge    │
                         └─────────────────┘
```

## Services

### 1. Speaker-embeddings Service
- **Purpose**: Диаризация аудио (определение спикеров)
- **Technology**: pyannote (SOTA 2024-2026)
- **Deployment**: HuggingFace Spaces или Docker
- **Endpoint**: `/api/diarize`

### 2. GigaAM Service  
- **Purpose**: Транскрипция русской речи
- **Technology**: GigaAM модели
- **Deployment**: HuggingFace Spaces
- **Endpoint**: `/api/transcribe-sync`

### 3. Inngest Jobs
- **Purpose**: Оркестрация обработки
- **Logic**: 
  1. Диаризация → сегменты спикеров
  2. Транскрипция каждого сегмента
  3. LLM merge результатов

## Environment Variables

```bash
# Speaker-embeddings (диаризация)
SPEAKER_EMBEDDINGS_URL=https://vnggncb-speaker-embeddings.hf.space

# GigaAM (транскрипция) 
GIGA_AM_TRANSCRIBE_URL=https://vnggncb-giga-am.hf.space/api/transcribe
GIGA_AM_ENABLED=true
GIGA_AM_TIMEOUT_MS=300000
```

## Deployment

### Option 1: Docker Compose (Recommended)

```yaml
version: "3"
services:
  # Speaker-embeddings - диаризация
  speaker-embeddings:
    build:
      context: ./services/speaker-embeddings
      dockerfile: Dockerfile
    environment:
      - HF_TOKEN=${HF_TOKEN}
      - PORT=7860
    ports:
      - "7860:7860"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7860/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # GigaAM - транскрипция
  giga-am:
    build:
      context: ./services/giga-am
      dockerfile: Dockerfile
    environment:
      - GIGA_AM_TRANSCRIBE_URL=${GIGA_AM_TRANSCRIBE_URL}
      - HOST=0.0.0.0
      - PORT=7860
    ports:
      - "7861:7860"
    depends_on:
      - speaker-embeddings
```

### Option 2: HuggingFace Spaces

1. **Deploy speaker-embeddings**:
   ```bash
   # Создайте новый Space с SDK=Docker
   # Загрузите содержимое ./services/speaker-embeddings
   # Добавьте HF_TOKEN в Settings → Variables and secrets
   ```

2. **Update GigaAM URL**:
   ```bash
   GIGA_AM_TRANSCRIBE_URL=https://vnggncb-giga-am.hf.space/api/transcribe
   ```

## API Usage

### Speaker-embeddings Diarization

```bash
curl -X POST https://your-space.hf.space/api/diarize \
  -F "file=@audio.wav" \
  -F "num_speakers=2" \
  -F "min_speakers=1" \
  -F "max_speakers=4"
```

**Response:**
```json
{
  "success": true,
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "speaker": "SPEAKER_00"
    },
    {
      "start": 5.5,
      "end": 12.1,
      "speaker": "SPEAKER_01"
    }
  ],
  "num_speakers": 2,
  "speakers": ["SPEAKER_00", "SPEAKER_01"]
}
```

### GigaAM Transcription

```bash
curl -X POST https://vnggncb-giga-am.hf.space/api/transcribe-sync \
  -F "file=@audio.wav" \
  -F "filename=call_audio.wav"
```

**Response:**
```json
{
  "success": true,
  "final_transcript": "Здравствуйте, это тестовый звонок...",
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Здравствуйте",
      "confidence": 0.95
    }
  ],
  "pipeline": "gigam-asr-only",
  "dual_asr_enabled": false
}
```

## Processing Flow

```typescript
// 1. Диаризация
const diarizationResult = await performDiarization(audioBuffer, filename);

// 2. Транскрипция сегментов
const transcribedSegments = [];
for (const segment of diarizationResult.segments) {
  const segmentAudio = await extractAudioSegment(audioBuffer, segment.start, segment.end);
  const result = await processAudioWithoutDiarization(segmentAudio, filename);
  
  transcribedSegments.push({
    speaker: segment.speaker,
    start: segment.start,
    end: segment.end,
    text: result.transcript,
    confidence: result.confidence
  });
}

// 3. LLM Merge
const mergedResult = await applyLLMMerging(nonDiarized, diarized, callId);
```

## Monitoring

### Health Checks

```bash
# Speaker-embeddings
curl https://your-space.hf.space/health

# GigaAM  
curl https://vnggncb-giga-am.hf.space/health
```

### Logs

```bash
# Docker Compose
docker-compose logs -f speaker-embeddings
docker-compose logs -f giga-am

# Production
docker logs speaker-embeddings
docker logs giga-am
```

## Troubleshooting

### Common Issues

1. **SPEAKER_EMBEDDINGS_URL not configured**
   ```
   Error: Remote diarization service недоступен
   Solution: Установите SPEAKER_EMBEDDINGS_URL в .env
   ```

2. **HF_TOKEN missing on speaker-embeddings**
   ```
   Error: pyannote не загружен
   Solution: Добавьте HF_TOKEN в HuggingFace Space settings
   ```

3. **Audio segmentation not working**
   ```
   Warning: extractAudioSegment использует заглушку
   Solution: Реализуйте правильное извлечение аудио сегментов
   ```

### Performance Tuning

```bash
# Speaker-embeddings
HF_TOKEN=your_token
PORT=7860

# GigaAM
GIGA_AM_TIMEOUT_MS=300000
MAX_FILE_SIZE_BYTES=104857600
```

## Migration from Old Architecture

1. **Backup current GigaAM service**
2. **Deploy speaker-embeddings service**
3. **Update environment variables**
4. **Restart services**
5. **Test with sample audio**

## Benefits

✅ **Separation of Concerns**: Каждый сервис отвечает за свою задачу
✅ **Scalability**: speaker-embeddings можно масштабировать отдельно  
✅ **SOTA Technology**: pyannote для диаризации, GigaAM для русской речи
✅ **Fallback Mechanism**: Если диаризация не удалась, используется обычная транскрипция
✅ **Maintainability**: Чистая архитектура с понятными границами
✅ **Cost Optimization**: Развертывание только нужных компонентов

## Support

- **Documentation**: [DIARIZATION_ARCHITECTURE_REFACTOR.md](./DIARIZATION_ARCHITECTURE_REFACTOR.md)
- **Issues**: Создавайте issues в репозитории
- **Monitoring**: Используйте health checks для мониторинга сервисов
