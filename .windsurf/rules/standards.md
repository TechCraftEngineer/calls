---
applyTo: "**/*"
alwaysApply: true
---

# Общие стандарты и команды проекта

## Команды

- `bun run build`: Build the project
- `bun run typecheck`: Run the typechecker
- `bun run test`: Run tests (prefer single test files for speed)

## Code style

- Использовать ES modules (import/export), не CommonJS (require)
- Destructure imports когда возможно: `import { foo } from 'bar'`
- Имена файлов в kebab-case (например: my-component.ts, user-profile.tsx)
- Функции в camelCase, компоненты в PascalCase, константы в UPPER_SNAKE_CASE

## Workflow

- После каждого написания или изменения кода обязательно выполнять:
  1. `bun lint` — проверка линтинга
  2. `bun typecheck` — проверка типов
- Исправлять все ошибки lint и typecheck перед завершением задачи
- API routes размещать в `packages/api/` следуя существующим паттернам
- Весь пользовательский контент (UI, сообщения, комментарии) на русском языке
