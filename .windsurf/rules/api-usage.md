---
applyTo: "apps/app/**/*.{tsx,ts}"
---

# API вызовы — только через oRPC

**Все вызовы API выполняются через oRPC**, а не через `fetch` к кастомным маршрутам (`/api/invitations/*`, `/api/something/*` и т.п.).

## Почему

- Маршруты `/api/invitations`, `/api/custom` и т.д. могут не проксироваться в Next.js (404)
- oRPC идёт через `/api/orpc`, который проксируется
- Типобезопасность, единый стиль, TanStack Query интеграция

## Как

```tsx
// ❌ Неправильно — fetch к кастомному маршруту
const res = await fetch(`${baseUrl}/api/invitations/accept`, {
  method: "POST",
  body: JSON.stringify({ token, password }),
});

// ✅ Правильно — oRPC mutation
const mutation = useMutation(
  orpc.workspaces.acceptInvitation.mutationOptions({
    onSuccess: () => router.push("/"),
  }),
);
mutation.mutate({ token, password, name });
```

## Добавление нового API

1. Создать процедуру в `packages/api/src/routers/{domain}/`
2. Экспортировать в index роутера
3. Использовать на клиенте через `orpc.{domain}.{procedure}.mutationOptions()` или `.queryOptions()`
