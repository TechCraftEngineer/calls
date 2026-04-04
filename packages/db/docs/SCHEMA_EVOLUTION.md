# Стратегия эволюции схемы и миграций

## Обзор

Этот документ описывает процесс управления изменениями схемы базы данных и миграциями в проекте.

## Процесс добавления/изменения таблиц и колонок

### Добавление новых таблиц

1. Определить схему таблицы в `packages/db/src/schema/{domain}/`
2. Использовать Drizzle ORM для определения колонок и типов
3. Добавить необходимые индексы и constraints
4. Сгенерировать миграцию: `bun migrate:create`
5. Проверить сгенерированный SQL файл
6. Применить миграцию локально: `bun db:migrate`
7. Протестировать изменения

### Изменение существующих таблиц

1. Обновить схему в исходном файле
2. Сгенерировать новую миграцию: `bun migrate:create`
3. Проверить, что миграция корректно обрабатывает существующие данные
4. Для destructive changes (удаление колонок) - создать бэкап данных

### Добавление колонок

- Nullable колонки: безопасно добавлять без ограничений
- NotNull колонки: требуют default значения или многоэтапной миграции:
  1. Добавить как nullable
  2. Заполнить существующие данные
  3. Изменить на notNull

## Правила создания новых миграций

### Когда создавать новую миграцию

- При добавлении/удалении таблиц
- При добавлении/удалении/изменении колонок
- При добавлении индексов
- При добавлении constraints (CHECK, UNIQUE, FOREIGN KEY)
- При изменении enum значений

### Когда НЕ создавать новую миграцию

- Не редактировать существующие применённые миграции
- Не удалять миграции, уже применённые в production

### Схема нумерации миграций

Используется Drizzle Kit с автоматической нумерацией:
- Формат: `XXXX_description.sql` (например: `0000_gifted_deathbird.sql`)
- ID миграции генерируется автоматически
- Журнал миграций: `packages/db/drizzle/meta/_journal.json`

## Обеспечение обратной совместимости

### Версионирование

- Использовать feature flags для breaking changes
- Постепенное внедрение: добавить новое поле → заполнить данные → переключить код → удалить старое поле

### Миграции с бэкапом

```bash
# Перед destructive migration
bun db:backup

# Применить миграцию
bun db:migrate

# Проверить целостность
bun db:verify
```

### Forward compatibility

- Новые поля должны иметь default значения или быть nullable
- Старый код должен работать с новой схемой
- Использовать `select *` осторожно - лучше явно указывать колонки

### Backfill данных

Для заполнения новых обязательных полей:

```typescript
// Миграция данных перед применением constraint
await db.update(table).set({ newField: defaultValue }).where(isNull(table.newField));
```

## Процесс развёртывания

### Локально

```bash
# Сгенерировать миграцию
bun migrate:create

# Применить миграцию
bun db:migrate

# Сбросить и пересоздать (для разработки)
bun db:reset
```

### Staging

1. Создать PR с миграцией
2. CI автоматически применит миграцию к staging БД
3. Протестировать функциональность
4. После approve - merge в main

### Production

1. Создать backup перед деплоем
2. Выполнить миграцию в maintenance window
3. Проверить логи на ошибки
4. Мониторинг метрик БД

### Откат (Rollback)

```bash
# Откат последней миграции
bun db:rollback

# Для production - использовать backup
pg_restore --dbname=production_db backup_file.sql
```

## Проверка целостности

```bash
# Проверка всех constraints
bun db:verify

# Lint SQL
bun db:lint
```

## CI/CD команды

```bash
# В GitHub Actions / CI
bun db:migrate        # Применить все pending миграции
bun db:seed           # Заполнить тестовыми данными (опционально)
bun test              # Запустить тесты
```

## Примеры

### Текущая миграция

Пример актуальной миграции: `0000_gifted_deathbird.sql` в `packages/db/drizzle/`

```sql
-- Создание enum типов
CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');

-- Создание таблицы с constraints
CREATE TABLE "calls" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "direction" "call_direction",
  CONSTRAINT "calls_direction_check" CHECK (direction IN ('inbound', 'outbound'))
);
```

## Рекомендации для разработчиков

1. Всегда проверять сгенерированный SQL перед применением
2. Тестировать миграции на копии production данных
3. Использовать транзакции для комплексных изменений
4. Документировать breaking changes в CHANGELOG
5. Держать миграции атомарными (одна логическая операция = одна миграция)

## Полезные ссылки

- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/migration.html)
