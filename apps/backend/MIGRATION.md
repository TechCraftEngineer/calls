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
- `POST /api/calls/:id/recommendations` — stub (501, DeepSeek не интегрирован)
- `POST /api/calls/:id/evaluate` — stub (501, DeepSeek не интегрирован)
- `DELETE /api/calls/:id` — удаление звонка (admin)
- `GET /api/records/:filename` — раздача аудиофайлов
- `GET /api/users` — список пользователей (admin)
- `POST /api/users` — создание пользователя (admin)
- `GET /api/users/:id` — данные пользователя
- `PUT /api/users/:id` — обновление пользователя
- `DELETE /api/users/:id` — удаление пользователя (admin)
- `POST /api/users/:id/change-password` — смена пароля (admin)
- `POST /api/users/:id/telegram-auth-url` — ссылка для привязки Telegram
- `DELETE /api/users/:id/telegram` — отвязка Telegram
- `POST /api/users/:id/max-auth-url` — ссылка для привязки MAX
- `DELETE /api/users/:id/max` — отвязка MAX
- `GET /api/settings/prompts` — промпты
- `PUT /api/settings/prompts` — обновление промптов (admin)
- `GET /api/settings/models` — модели DeepSeek
- `POST /api/settings/backup` — резервная копия БД (admin)
- `GET /api/statistics` — статистика (admin)
- `GET /api/metrics` — метрики
- `POST /api/reports/send-test-telegram` — stub (501, Telegram не интегрирован)

### oRPC API

- `auth.login`, `auth.logout`, `auth.me`
- `calls.list`, `calls.get`, `calls.generateRecommendations` (placeholder)
- `users.list`, `users.get`, `users.create`, `users.update`, `users.delete`
- `users.changePassword`, `users.telegramAuthUrl`, `users.disconnectTelegram`, `users.maxAuthUrl`, `users.disconnectMax`
- `settings.getPrompts`, `settings.updatePrompts`, `settings.getModels`, `settings.backup`
- `statistics.getStatistics`, `statistics.getMetrics`
- `reports.sendTestTelegram` (stub)

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
