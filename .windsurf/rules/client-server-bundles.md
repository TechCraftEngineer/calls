---
applyTo: "apps/app/**/*"
---

# Рекомендации: Client/Server разделение бандлов

## Принцип

Клиентские компоненты (Next.js `"use client"`, Server Actions вызывают сервер) не должны импортировать пакеты с Node.js/серверными зависимостями (cheerio, puppeteer, sharp, drizzle db client и т.д.). Это раздувает бандл и может вызывать ошибки в браузере.

---

## ✅ Рекомендуемые импорты для клиента

| Задача | Пакет | Пример |
|--------|-------|--------|
| Утилиты дат (возраст, форматирование) | `@calls/lib/utils` | `import { calculateAge, formatBirthDate } from "@calls/lib/utils"` |
| Inngest каналы и схемы | `@calls/jobs/channels` | `import { analyzeResponseProgressSchema } from "@calls/jobs/channels"` |
| Типы API | `@calls/api` | `import type { RouterOutputs } from "@calls/api"` |
| Утилиты (инициалы, форматирование) | `@calls/shared` | `import { getInitials, getResponseEventTitle } from "@calls/shared"` |
| Схемы и константы БД | `@calls/db/schema` | `import { RESPONSE_STATUS_LABELS } from "@calls/db/schema"` |
| Пути, конфиг | `@calls/config` | `import { paths, APP_CONFIG } from "@calls/config"` |
| UI компоненты | `@calls/ui` | — |
| Валидация (Zod схемы) | `@calls/validators` | — |

---

## ❌ Запрещённые импорты в клиентских компонентах

| Пакет | Причина |
|-------|---------|
| `@calls/lib` (main) | Barrel с rate-limiter, logger, может тянуть server-код |
| `@calls/lib/ai` | AI SDK, Langfuse, sharp |
| `@calls/lib/s3` | AWS SDK |
| `@calls/lib/image` | sharp |
| `@calls/lib/server` | Pin validation, server-only логика |
| `@calls/integration-clients/server` | cheerio, парсинг HTML |
| `@calls/jobs-parsers` | puppeteer, crawlee, cheerio |
| `@calls/db` или `db/client` | Drizzle client, pg — только schema для типов/констант |
| `@calls/server-utils` | rate limit, db — только для middleware/API |

---

## Структура пакетов с server-only кодом

### integration-clients
- `integration-clients` — HTTP API (axios), допустим на клиенте при необходимости
- `integration-clients/server` — web-offers (cheerio), только сервер. Защищён `server-only`

### lib
- `lib/utils` — date-utils, sanitize — client-safe
- `lib` (main) — смешанный barrel, предпочитать `lib/utils` для клиента
- `lib/ai`, `lib/s3`, `lib/image`, `lib/server` — только сервер

### jobs
- `jobs/channels` — zod-схемы, inngest-realtime — client-safe
- `jobs/client` — Inngest client, использовать в Server Actions
- `jobs/services/kwork` — только executeWithKworkTokenRefresh (API-safe, без cheerio)
- `jobs/services/kwork/get-kwork-project-offers` — getProjectOffersFromWebWithCache (cheerio, jobs-parsers) — только Inngest

### shared
- `shared` — client-safe (utils, schemas, constants)
- `shared/server` — ranking, interview — только сервер

---

## Чеклист для новых клиентских компонентов

1. [ ] Импорт из `lib` → использовать `lib/utils` для date/sanitize
2. [ ] Импорт типов API → только `import type`, не значения
3. [ ] Импорт из db → только `db/schema` (типы, константы), не `db`/`db/client`
4. [ ] Нет импорта jobs-parsers, integration-clients/server
5. [ ] Нет импорта lib/ai, lib/s3, lib/image

---

## Пакет api (Next.js сервер)

### Рекомендуемые импорты
- `@calls/db`, `db/client`, `db/schema` — Drizzle, репозитории
- `@calls/lib/ai`, `lib/s3`, `lib/image` — серверные утилиты
- `@calls/integration-clients` — HTTP API (не /server, если не нужен cheerio)
- `@calls/jobs/client` — Inngest для фоновых задач
- `@calls/shared/server` — RankingService, InterviewLinkGenerator и т.д.
- `@calls/config`, `@calls/emails` — конфиг, отправка писем

### serverExternalPackages (next.config)
Для корректной сборки добавить: `@calls/lib`, `@calls/document-processor`.
