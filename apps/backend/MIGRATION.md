# Миграция Python Backend → oRPC + Hono

## Текущее состояние

Создана новая реализация backend на стеке **oRPC + Hono (TypeScript)**:

- **`packages/backend-storage`** — слой работы с SQLite (совместим с существующей `db.sqlite`)
- **`packages/backend-api`** — oRPC router с procedures (auth, calls)
- **`apps/backend-server`** — Hono‑сервер на порту 8000 (по умолчанию)

## Запуск

```bash
# Из корня проекта
bun run dev:backend

# Или напрямую
cd apps/backend-server && bun run dev
```

Сервер поднимается на `http://localhost:8000`.

## Реализовано

### REST API (совместимость с frontend)

- `POST /api/auth/login` — авторизация (cookie `session`)
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — текущий пользователь
- `GET /api/calls` — список звонков (пагинация, фильтры)
- `GET /api/calls/:id` — детали звонка
- `GET /api/records/:filename` — раздача аудиофайлов

### oRPC API

- `auth.login`, `auth.logout`, `auth.me`
- `calls.list`, `calls.get`, `calls.generateRecommendations` (placeholder)

## Что ещё нужно перенести

1. **Роутеры и процедуры**
   - users (CRUD, change-password, telegram/max)
   - settings (prompts, models, backup)
   - reports (send-test-telegram)
   - statistics, search, evaluations
   - records sync, transcripts (transcribe), chat (AI)

2. **Сервисы**
   - DeepSeek (рекомендации)
   - AssemblyAI / SaluteSpeech (транскрипция)
   - ChromaDB / vector_db (поиск)
   - Telegram, MAX Messenger
   - Reports (scheduler, email)

3. **Frontend**
   - Постепенный переход с axios на oRPC client (`@orpc/client`)
   - Настройка proxy / base URL на `backend-server`

## База данных

Используется та же SQLite (`apps/backend/data/db.sqlite`), что и у Python backend. Миграция данных не требуется.

## Переменные окружения

- `BACKEND_PORT` / `PORT` — порт (по умолчанию 8000)
- `BACKEND_DB_PATH` — путь к `db.sqlite`
- `CORS_ORIGINS` — CORS origins (по умолчанию `http://localhost:3000`)
- `DEPLOYMENT_ENV=docker` — для Docker (пути `/app/data`, `/app/records`)
