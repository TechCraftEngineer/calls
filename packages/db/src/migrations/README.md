# Workspace ID Generator

## Обзор

Этот пакет содержит SQL функции для генерации workspace ID с префиксом `ws_` и использованием UUIDv7 для обеспечения сортируемости по времени.

## Файлы

- `001_create_workspace_id_function.sql` - SQL скрипт с функциями
- `../utils/workspace-id-generator.ts` - TypeScript утилиты
- `../scripts/setup-workspace-function.ts` - Скрипт установки

## Функции

### `workspace_id_generate()`

Генерирует workspace ID в формате `ws_12345678901234567890123456789012`

**Пример:**
```sql
SELECT workspace_id_generate();
-- Результат: ws_018f8a6b2d8f7c4e9a1b2c3d4e5f6a7b
```

### `uuidv7()`

Генерирует UUIDv7 с временной меткой для сортируемости.

**Пример:**
```sql
SELECT uuidv7();
-- Результат: 018f8a6b-2d8f-74e9-a1b2-c3d4e5f6a7b8
```

### `test_workspace_id_generate(count)`

Тестовая функция для генерации нескольких workspace ID.

**Пример:**
```sql
SELECT * FROM test_workspace_id_generate(5);
```

## Установка

### Способ 1: Через SQL скрипт

```bash
psql -d your_database -f 001_create_workspace_id_function.sql
```

### Способ 2: Через TypeScript скрипт

```bash
cd packages/db
bun run db:setup-workspace
```

### Способ 3: Через Drizzle миграцию

Добавьте в миграцию:

```typescript
import { sql } from "drizzle-orm";

// В вашей миграции
await db.execute(sql`
  CREATE OR REPLACE FUNCTION workspace_id_generate()
  RETURNS TEXT AS $$
  BEGIN
      RETURN 'ws_' || REPLACE(uuidv7()::TEXT, '-', '');
  END;
  $$ LANGUAGE plpgsql;
`);
```

## Использование в коде

```typescript
import { workspaceIdGenerate } from "../utils/workspace-id-generator";

// В схеме Drizzle
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey().default(workspaceIdGenerate),
  // ...
});
```

## Валидация

```typescript
import { 
  isValidWorkspaceId, 
  extractUuidFromWorkspaceId,
  formatWorkspaceId 
} from "../utils/workspace-id-generator";

// Проверка формата
const isValid = isValidWorkspaceId("ws_12345678901234567890123456789012");

// Извлечение UUID
const uuid = extractUuidFromWorkspaceId("ws_12345678901234567890123456789012");

// Форматирование
const workspaceId = formatWorkspaceId("12345678-1234-1234-1234-123456789012");
```

## Преимущества UUIDv7

1. **Сортируемость по времени** - ID упорядочены по времени создания
2. **Производительность индексов** - Лучшее распределение в B-tree индексах
3. **Человекочитаемые префиксы** - `ws_` для легкой идентификации
4. **Уникальность** - Глобальная уникальность без необходимости координации

## Тестирование

```bash
# Запуск тестов генерации
bun run db:test-workspace

# Или через psql
psql -d your_database -c "SELECT * FROM test_workspace_id_generate(10);"
```

## Совместимость

- PostgreSQL 12+
- Требует расширения `pgcrypto` для `GEN_RANDOM_BYTES()`

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
