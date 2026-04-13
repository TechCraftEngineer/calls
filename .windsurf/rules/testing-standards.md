---
applyTo: "apps/playwright/**/*"
---

Правила End-to-End тестирования с использованием Playwright и Cypress для обеспечения качества приложений.

## Key Principles

- Тестировать приложение с точки зрения пользователя
- Симулировать реальные пользовательские сценарии (flows)
- Тестировать deployed application (или production-like build)
- Приоритизировать critical user journeys
- Flakiness is the enemy

## Playwright Features

- Cross-browser support (Chromium, Firefox, WebKit)
- Auto-waiting mechanism
- Parallel execution
- Trace Viewer для debugging
- Codegen для recording tests

## Cypress Features

- Time travel debugging
- Automatic waiting
- Network traffic control
- Real-time reloads
- Component testing support

## Selectors

- Использовать user-facing attributes (role, text, label)
- Избегать implementation details (CSS classes, XPaths)
- Использовать data-testid как last resort

## Best Practices

- Isolate state (fresh login per test)
- Использовать Page Object Model (POM) для maintainability
- Обрабатывать authentication programmatically (bypass UI login)
- Ждать API responses, а не arbitrary timeouts
- Запускать E2E tests на staging/preview environments
- Записывать video/screenshots on failure
