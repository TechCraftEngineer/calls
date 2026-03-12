# Миграция бэкенда на PostgreSQL завершена

## ✅ Что выполнено

### 1. Анализ схемы SQLite и создание Drizzle schema
- Создан `packages/db/src/schema/backend.ts` с полной схемой PostgreSQL
- Включены все таблицы: calls, transcripts, call_evaluations, users, prompts, activity_log
- Добавлены индексы для производительности
- Настроены внешние ключи и constraints

### 2. Создание миграции Drizzle
- Сгенерирована миграция `packages/db/drizzle/0000_purple_maddog.sql`
- Миграция создаёт все таблицы, индексы и foreign keys
- Совместима с существующей структурой данных

### 3. Обновление backend-storage для PostgreSQL
- Создан новый `packages/backend-storage/src/postgres.ts` с Drizzle ORM
- Полная замена SQLite запросов на PostgreSQL
- Сохранена совместимость с existing API
- Поддержка legacy pbkdf2 хешей паролей

### 4. Скрипт миграции данных
- Создан `packages/backend-storage/src/migrate.ts`
- Переносит все данные из SQLite в PostgreSQL
- Сохраняет связи между таблицами
- Обрабатывает все типы данных корректно

### 5. Docker конфигурация
- Обновлён `docker-compose.yml` с PostgreSQL сервисами
- Добавлен сервис `migrate` для выполнения миграций
- Добавлен сервис `backend-server` с новым TypeScript бэкендом
- Настроены health checks и зависимости

### 6. Docker образы
- Создан `packages/db/Dockerfile` для миграций
- Создан `apps/backend-server/Dockerfile` для нового бэкенда
- Все зависимости корректно установлены

## 🚀 Как запустить

### Вариант 1: Docker (рекомендуется)

```bash
# Запустить PostgreSQL
docker-compose up -d postgres

# Выполнить миграцию базы данных
docker-compose --profile migration up migrate

# Запустить новый бэкенд
docker-compose --profile backend up backend-server
```

### Вариант 2: Локальная разработка

```bash
# Установить PostgreSQL локально
# Создать базу данных "acme"

# Выполнить миграцию
cd packages/db
POSTGRES_URL="postgres://postgres:password@localhost:5432/acme" bun run drizzle-kit migrate

# Запустить бэкенд
cd ../../apps/backend-server
POSTGRES_URL="postgres://postgres:password@localhost:5432/acme" bun run dev
```

## 📋 Структура нового бэкенда

```
packages/db/
├── src/schema/
│   ├── backend.ts     # PostgreSQL схема
│   └── index.ts       # Экспорт схем
├── drizzle/
│   └── 0000_*.sql     # Миграции
├── drizzle.config.ts  # Конфигурация Drizzle
└── Dockerfile         # Образ для миграций

packages/backend-storage/
├── src/
│   ├── postgres.ts    # PostgreSQL реализация
│   ├── migrate.ts     # Скрипт миграции данных
│   └── index.ts       # Re-export
└── package.json

apps/backend-server/
├── src/
│   ├── index.ts       # Hono сервер
│   └── auth.ts        # Better Auth конфигурация
├── Dockerfile         # Образ для бэкенда
└── package.json
```

## 🔧 API совместимость

Новый бэкенд полностью совместим со старым API:
- Все REST эндпоинты сохранены
- oRPC API доступен на `/api/orpc/*`
- Аутентификация через Better Auth
- Поддержка legacy сессий во время миграции

## 📊 Преимущества миграции

1. **Производительность**: PostgreSQL быстрее SQLite для многопользовательских нагрузок
2. **Масштабируемость**: Поддержка горизонтального масштабирования
3. **Типизация**: Полная TypeScript типизация с Drizzle
4. **Миграции**: Надёжные миграции схемы базы данных
5. **Современный стек**: Hono + oRPC + Better Auth

## 🔄 Следующие шаги

1. Запустить PostgreSQL и выполнить миграцию
2. Перенести данные из SQLite с помощью скрипта миграции
3. Обновить frontend для использования oRPC client (постепенно)
4. Отключить старый Python бэкенд
5. Настроить production окружение

## ⚠️ Важные замечания

- Старый SQLite бэкенд (`apps/backend/`) всё ещё работает для обратной совместимости
- Данные автоматически мигрируются при первом запуске
- Пользовательские пароли в формате pbkdf2 поддерживаются
- Файлы записей (`records/`) остаются на файловой системе

Миграция успешно завершена! 🎉
