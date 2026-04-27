# Инструкция для AI-ботов (Code Rabbit / Windsurf / Cursor)

> **Применимо к:** `apps/app/**/*`, `packages/**/*`, `tooling/**/*`

---

## 1. Общие принципы

### Стек технологий
- **Runtime:** Bun 1.3.5+
- **Monorepo:** Turborepo 2.9+
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui
- **API:** oRPC (OpenAPI-RPC) + TanStack Query
- **База данных:** Drizzle ORM + Neon Postgres
- **Аутентификация:** Better Auth
- **Валидация:** Zod v4
- **Линтер:** Biome 2.4+

### Архитектура монорепозитория

```
apps/
  app/                    # Next.js приложение (frontend + API routes)
  app-server/             # Серверное приложение
  ai-proxy/               # Прокси для AI-запросов

packages/
  api/                    # oRPC роутеры и процедуры
  auth/                   # Better Auth конфигурация
  config/                 # Типобезопасные env переменные
  db/                     # Drizzle схемы и клиент
  emails/                 # React Email шаблоны
  jobs/                   # Background задачи
  lib/                    # Утилиты и shared код
  logger/                 # Логирование
  shared/                 # Shared типы и константы
  telegram-bot/             # Telegram бот
  ui/                     # shadcn/ui компоненты
  validators/             # Zod схемы валидации

tooling/
  tailwind/               # Shared Tailwind конфиг
  typescript/             # Shared TypeScript конфиг
```

### Dependency Direction (строго соблюдать)
```
db → api → app
validators → db, api, app
shared → все пакеты
```

**Запрещено:** пакеты `app` не должны импортировать `db` напрямую — только через `api`.

---

## 2. Соглашения об именовании

### Файлы
- **Kebab-case** для всех файлов: `user-profile.tsx`, `use-auth.ts`, `api-client.ts`
- **Запрещено:** CamelCase, PascalCase для имен файлов

### Код
| Сущность | Стиль | Пример |
|----------|-------|--------|
| Функции | camelCase | `getUserById()` |
| Компоненты | PascalCase | `UserProfileCard` |
| Константы | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Типы/Интерфейсы | PascalCase | `UserProfile` |
| Переменные | camelCase | `userName` |

### Пакеты
- Все internal пакеты: `@calls/*` (например: `@calls/db`, `@calls/api`)

---

## 3. TypeScript стандарты

### Строгая типизация
- **Запрещено:** `any`, `unknown`, `{}` — всегда использовать конкретные типы
- Использовать брендированные типы для доменных сущностей:
  ```ts
  type UserId = string & { __brand: 'UserId' };
  type Email = string & { __brand: 'Email' };
  ```

### Функции
- Всегда указывать return type для публичных функций
- Использовать early returns для уменьшения вложенности
- Максимум 400 строк на файл — при превышении разбивать на модули

### Path Aliases
| Проект | Alias | Путь |
|--------|-------|------|
| apps/app | `~/*` | `./src/*` |
| apps/app | `@/*` | `./src/*` |
| packages/* | `~/*` | `./src/*` |

---

## 4. React + Next.js стандарты

### Компоненты
- **Server Components по умолчанию** — явно добавлять `'use client'` только при необходимости
- Использовать композицию вместо наследования
- Правильные key props в списках (не использовать index как key)

### Хуки
- Предотвращать утечки памяти в useEffect с cleanup функциями
- Использовать `useCallback`/`useMemo` для оптимизации тяжелых вычислений
- `React.forwardRef` для компонентов, которым нужна передача ref

### Состояние и данные
- **TanStack Query** для server state
- **Zustand или React Context** для client state
- Оптимистичные обновления с rollback при ошибках

---

## 5. oRPC + TanStack Query паттерны

### Обязательные правила
1. Получать клиент через `useORPC()`
2. Использовать фабрики `.queryOptions()` и `.mutationOptions()`
3. Передавать результаты в нативные хуки TanStack Query
4. **НЕ** вызывать `orpc.procedure.useQuery()` напрямую

### Query пример
```tsx
import { useORPC } from "~/orpc/react";
import { useQuery } from "@tanstack/react-query";

const orpc = useORPC();
const { data, isPending } = useQuery(
  orpc.brands.getById.queryOptions({ id: brandId })
);
```

### Условные запросы (skipToken)
```tsx
import { skipToken } from "@tanstack/react-query";

const { data } = useQuery(
  orpc.user.details.queryOptions(
    userId ? { userId } : skipToken
  )
);
```

### Mutation с инвалидацией
```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

const orpc = useORPC();
const queryClient = useQueryClient();

const { mutate } = useMutation(
  orpc.brands.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.brands.list.queryKey(),
      });
    },
  })
);
```

---

## 6. База данных (Drizzle)

### Схемы
- Нормализация по умолчанию
- Имена таблиц: plural (users, companies, calls)
- Имена колонок: snake_case (user_id, created_at)
- Foreign keys: `fk_table_column`
- Индексы: `idx_table_column`

### Пример схемы
```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_users_email").on(table.email),
]);
```

### Запросы
- Оптимизировать с `with` для includes
- Использовать индексы для частых фильтров
- Кэшировать частые запросы

---

## 7. Валидация (Zod)

- Валидировать **все** входные данные на границах (API, формы, query params)
- Shared схемы в `packages/validators/`
- Использовать `.transform()` и `.refine()` для сложной валидации

### Пример
```ts
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

---

## 8. Обработка ошибок

### API ошибки
- Использовать `TRPCError` с правильными HTTP кодами
- Сообщения об ошибках — **на русском языке**
- Всегда логировать неожиданные ошибки

### UI ошибки
- Показывать понятные сообщения пользователю
- Использовать Error Boundaries для React компонентов
- Состояния загрузки и ошибок для всех async операций

---

## 9. UI/UX стандарты

### Язык
- **Весь пользовательский текст на русском языке**
- Использовать понятную терминологию для российского рынка
- Заменять англицизмы: "кликнуть" → "нажать", "чекнуть" → "проверить"

### Доступность
- ARIA метки и роли для интерактивных элементов
- Клавиатурная навигация
- Семантический HTML
- Контрастность цветов WCAG 2.1 AA

### Форматы
- Даты: DD.MM.YYYY
- Время: 24-часовой формат
- Валюта: рубли (₽)
- Телефоны: +7 (XXX) XXX-XX-XX

---

## 10. AI интеграция

- Всегда валидировать входные данные с Zod перед отправкой в AI
- Использовать streaming для длинных ответов
- Показывать индикаторы загрузки
- Реализовать graceful degradation при ошибках
- Rate limiting и фильтрация вредоносного контента
- Логирование всех AI взаимодействий

---

## 11. Git и коммиты

- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Четкие сообщения на английском
- Feature branches: `feature/description`, `fix/description`

---

## 12. Команды для проверки

```bash
# После любых изменений обязательно выполнить:
bun lint          # Проверка линтера
bun typecheck     # Проверка типов
bun check         # Линтер + форматирование

# Исправление автоматически:
bun lint:fix      # Исправить lint ошибки
bun format:fix    # Исправить форматирование
bun check:fix     # Исправить всё

# Разработка:
bun dev           # Запуск dev сервера
bun dev:next      # Только Next.js
bun db:push       # Применить миграции БД
bun db:studio     # Drizzle Studio
```

---

## 13. Безопасность

- Никогда не коммитить секреты — использовать `.env.example`
- Валидировать все входные данные
- Защита от CSRF (встроена в Better Auth)
- SQL injection защита (Drizzle ORM)
- XSS защита (React автоматически экранирует)

---

## 14. Тестирование

- Unit тесты для утилит в `packages/lib/`
- E2E тесты для критических путей в `packages/e2e/` (Playwright)
- Интеграционные тесты для API

---

## 15. Проверочный лист перед коммитом

- [ ] Код проходит `bun lint` без ошибок
- [ ] Код проходит `bun typecheck` без ошибок
- [ ] Все файлы в kebab-case
- [ ] Нет `any`, `unknown` типов
- [ ] Все пользовательские тексты на русском
- [ ] Обработаны ошибки async операций
- [ ] Используются правильные query keys для инвалидации
- [ ] Нет секретов в коде
- [ ] Файл не превышает 400 строк

---

## Полезные ссылки

- [Biome документация](https://biomejs.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [oRPC документация](https://orpc.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Better Auth](https://better-auth.com/)
- [shadcn/ui](https://ui.shadcn.com/)
