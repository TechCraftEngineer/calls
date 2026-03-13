# @calls/backend-api

**Основной API слой проекта.** Содержит oRPC роутеры и типизированный клиент.

## Использование

### HTTP-клиент (frontend, внешние сервисы)

```ts
import { createBackendClient } from "@calls/backend-api";

const api = createBackendClient("http://localhost:8000");

const calls = await api.calls.list({ page: 1, per_page: 15 });
const user = await api.auth.me();
```

### Серверная сторона (REST handlers в backend-server)

```ts
import { createBackendContext, createBackendApiWithContext } from "@calls/backend-api";

const ctx = await createBackendContext({ headers: req.headers, auth });
const api = createBackendApiWithContext(ctx);

const result = await api.calls.list({ page: 1 });
```

### oRPC (прямые вызовы)

Эндпоинт: `POST /api/orpc/calls/list`, `POST /api/orpc/users/list` и т.д.

## Роутеры

- **auth** — login, logout, me
- **calls** — list, get, delete, generateRecommendations
- **users** — list, get, create, update, delete, changePassword, telegram/max
- **settings** — getPrompts, updatePrompts, getModels, backup
- **statistics** — getStatistics, getMetrics
- **reports** — sendTestTelegram
