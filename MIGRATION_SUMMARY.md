# Миграция: Удаление duration и sizeBytes из таблицы calls

## Обзор
Поля `duration` и `sizeBytes` удалены из таблицы `calls`. Теперь эти данные хранятся только в таблице `files`:
- `durationSeconds` (тип `real`) - длительность аудио в секундах
- `sizeBytes` (тип `integer`) - размер файла в байтах

## Изменения в базе данных

### Миграции
- **Файл**: `packages/db/drizzle/0005_remove_duration_from_calls.sql`
  - Удаление колонки `duration` из таблицы `calls`
- **Файл**: `packages/db/drizzle/0006_remove_size_bytes_from_calls.sql`
  - Удаление колонки `size_bytes` из таблицы `calls`

### Схема
- **Файл**: `packages/db/src/schema/calls/calls.ts`
  - Удалено поле `duration: integer("duration")`
  - Удалено поле `sizeBytes: integer("size_bytes")`
  - Удален неиспользуемый импорт `integer`

## Изменения в коде

### Типы
- **Файл**: `packages/db/src/types/calls.types.ts`
  - Удалено `duration?: number | null` из `CreateCallData`
  - Удалено `sizeBytes?: number | null` из `CreateCallData`
  - Добавлено `fileDuration: number | null` в `CallWithTranscript`
  - Добавлено `fileSizeBytes: number | null` в `CallWithTranscript`

### Репозитории
- **Файл**: `packages/db/src/repositories/calls.repository.ts`
  - Удален метод `updateDuration()`
  - Обновлен метод `updateRecording()` - убрано поле `sizeBytes`
  - Обновлен `createWithResult()` - убрано использование `data.duration` и `data.sizeBytes`
  - Обновлен `findWithTranscriptsAndEvaluations()` - добавлен JOIN с `files` и возврат `fileDuration` и `fileSizeBytes`

- **Файл**: `packages/db/src/repositories/calls/get-metrics.ts`
  - Обновлен запрос для использования `files.durationSeconds` вместо `calls.duration`

- **Файл**: `packages/db/src/repositories/calls/get-kpi-stats.ts`
  - Обновлен запрос для использования `files.durationSeconds` вместо `calls.duration`
  - Обновлен комментарий

- **Файл**: `packages/db/src/repositories/calls/get-evaluations-stats.ts`
  - Обновлен запрос для использования `files.durationSeconds` вместо `calls.duration`
  - Удален неиспользуемый импорт `desc`

### Сервисы
- **Файл**: `packages/db/src/services/calls.service.ts`
  - Удален метод `updateCallDuration()`
  - Обновлен метод `updateCallRecording()` - убрано поле `sizeBytes` из параметров

### Jobs
- **Файл**: `packages/jobs/src/megafon/ftp-sync.ts`
  - Удалена переменная `callDurationSeconds`
  - Обновлен комментарий
  - Убраны поля `duration` и `sizeBytes` из вызова `createCall()`

- **Файл**: `packages/jobs/src/megapbx/sync.ts`
  - Убраны поля `duration` и `sizeBytes` из вызова `upsertCall()`
  - Обновлена функция `uploadRecordingIfNeeded()` - убрано возвращаемое поле `sizeBytes`
  - Обновлен вызов `updateCallRecording()` - убрано поле `sizeBytes`

- **Файл**: `packages/jobs/src/inngest/functions/transcribe-call.ts`
  - Удален вызов `updateCallDuration()`

### API
- **Файл**: `packages/api/src/routers/calls/list.ts`
  - Обновлено использование `item.fileDuration` вместо `item.call.duration`

- **Файл**: `packages/api/src/routers/calls/get.ts`
  - Обновлено получение `sizeBytes` из связанного файла через `filesService.getFileById()`

## Как применить миграции

```bash
# В packages/db
npm run db:migrate
```

## Важные замечания

1. Длительность теперь хранится только в `files.durationSeconds` (тип `real`)
2. Размер файла теперь хранится только в `files.sizeBytes` (тип `integer`)
3. Для получения длительности и размера звонка нужно делать JOIN с таблицей `files` через `calls.fileId`
4. `CallWithTranscript` теперь включает поля `fileDuration` и `fileSizeBytes` для удобства
5. Все запросы обновлены для использования данных из таблицы `files`
