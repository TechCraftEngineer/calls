# Сохранение улучшенного аудио

## Обзор

Система теперь автоматически сохраняет улучшенную версию аудио в S3 и предоставляет возможность прослушивания в UI для сравнения с оригиналом.

## Что было добавлено

### 1. База данных

**Миграция:** `packages/db/drizzle/0005_add_enhanced_audio_file_id.sql`
- Добавлено поле `enhanced_audio_file_id` в таблицу `calls`
- Добавлен индекс для быстрого поиска

**Схема:** `packages/db/src/schema/calls/calls.ts`
```typescript
enhancedAudioFileId: uuid("enhanced_audio_file_id").references(() => files.id, {
  onDelete: "set null",
})
```

### 2. Backend

**Repository:** `packages/db/src/repositories/calls.repository.ts`
- Метод `updateEnhancedAudio(callId, enhancedAudioFileId: string | null)` — сохранение ID файла или сброс ссылки (`null`)

**Service:** `packages/db/src/services/calls.service.ts`
- Метод `updateEnhancedAudio(callId, enhancedAudioFileId: string | null)` для обновления звонка

**FileSource:** `packages/lib/src/s3.ts`
- Добавлен новый источник `"asr-preprocessing"` для улучшенных файлов

### 3. ASR Pipeline

**Types:** `packages/jobs/src/asr/types.ts`
```typescript
export interface PipelineResult {
  // ... существующие поля
  enhancedAudioBuffer?: Buffer;
  enhancedAudioFilename?: string;
}
```

**Preprocessing:** `packages/jobs/src/asr/audio-preprocessing.ts`
- Функция `preprocessAudio` теперь возвращает `enhancedAudioBuffer` и `enhancedAudioFilename`
- Поддержка как Python ML, так и FFmpeg обработки

**Pipeline:** `packages/jobs/src/asr/pipeline.ts`
- Передает `enhancedAudioBuffer` и `enhancedAudioFilename` в результат

**Transcribe Job:** `packages/jobs/src/inngest/functions/transcribe-call.ts`
- Автоматически сохраняет улучшенное аудио в S3 через `filesService.uploadFile`
- Обновляет `enhancedAudioFileId` в таблице `calls`
- Graceful handling: если сохранение не удалось, продолжает без ошибки

### 4. API

**Endpoint:** `packages/api/src/routers/calls/get-enhanced-playback-url.ts`
```typescript
export const getEnhancedPlaybackUrl = workspaceProcedure
  .input(z.object({ call_id: z.string() }))
  .handler(async ({ input, context }) => {
    // Возвращает presigned URL для улучшенного аудио
    // Или { url: null } если улучшенное аудио отсутствует
  });
```

**Router:** `packages/api/src/routers/calls/index.ts`
- Добавлен `getEnhancedPlaybackUrl` в `callsRouter`

### 5. Frontend

**Компонент:** `apps/app/src/components/features/calls/audio-comparison-player.tsx`
- Новый компонент для сравнения оригинального и улучшенного аудио
- Автоматически определяет наличие улучшенного аудио
- Если улучшенное аудио есть → показывает табы для сравнения
- Если нет → показывает только оригинал

**UI:** `apps/app/src/components/features/calls/call-detail-modal/evaluation-sidebar.tsx`
- Заменен `CallRecordPlayer` на `AudioComparisonPlayer`
- Пользователь может переключаться между оригиналом и улучшенной версией

## Как это работает

### Процесс обработки

1. **Транскрибация запускается** (`transcribe-call.ts`)
2. **Предобработка аудио** (`audio-preprocessing.ts`)
   - Python ML или FFmpeg обрабатывает аудио
   - Возвращает Buffer улучшенного аудио
3. **Сохранение в S3** (`transcribe-call.ts`)
   - Загружает Buffer в S3 через `filesService.uploadFile`
   - Создает запись в таблице `files`
4. **Обновление БД** (`transcribe-call.ts`)
   - Сохраняет `enhancedAudioFileId` в таблице `calls`
5. **Отображение в UI** (`audio-comparison-player.tsx`)
   - Загружает оба URL (оригинал и улучшенное)
   - Показывает табы для сравнения

### Пример использования

```typescript
// Backend автоматически сохраняет улучшенное аудио
const result = await runTranscriptionPipeline(audioUrl, {
  companyContext: "Компания занимается поставками",
  // audioPreprocessing включена по умолчанию
});

// result.enhancedAudioBuffer содержит Buffer улучшенного аудио
// result.enhancedAudioFilename содержит имя файла
```

```typescript
// Frontend автоматически загружает и отображает
<AudioComparisonPlayer callId={call.id} />
```

## Преимущества

1. **Прозрачность**: Пользователь может сравнить оригинал и улучшенную версию
2. **Качество**: Улучшенное аудио используется для ASR, что повышает точность
3. **Отладка**: Можно прослушать результат обработки для проверки качества
4. **Автоматизация**: Всё происходит автоматически, без дополнительных действий

## Технические детали

### Формат файлов

- **Оригинал**: MP3 (как загружен)
- **Улучшенное**: WAV 16kHz mono PCM (оптимально для ASR)

### Хранение

- **S3 Bucket**: Тот же bucket, что и оригинальные файлы
- **Storage Key**: `workspaceId/asr-preprocessing/date/enhanced_filename.wav`
- **Metadata**: 
  - `originalCallId`: ID оригинального звонка
  - `preprocessed: true`
  - `processingTimeMs`: Время обработки

### Производительность

- **Размер файла**: ~1-2 MB на минуту аудио (WAV)
- **Время загрузки**: ~1-2 секунды (параллельно с транскрибацией)
- **Стоимость S3**: ~$0.023 за GB/месяц

## Миграция

Для применения изменений:

```bash
# 1. Применить миграцию БД
cd packages/db
bun run db:push

# 2. Пересобрать проект
bun run build

# 3. Перезапустить сервисы
docker-compose restart
```

## Обратная совместимость

- Старые звонки без `enhancedAudioFileId` продолжают работать
- UI автоматически определяет наличие улучшенного аудио
- Если улучшенное аудио отсутствует → показывается только оригинал
