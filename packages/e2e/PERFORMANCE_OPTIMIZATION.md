# Оптимизация производительности E2E тестов

## Проблемы в текущих тестах

### 1. Повторяющиеся переходы на страницы (критично)
```typescript
// ❌ Плохо - каждый тест делает полную перезагрузку
test("тест 1", async ({ page }) => {
  await page.goto("/users"); // ~500-1000ms
});

test("тест 2", async ({ page }) => {
  await page.goto("/users"); // еще ~500-1000ms
});

// ✅ Хорошо - переход один раз в beforeEach
test.beforeEach(async ({ page }) => {
  await helpers.gotoUsersPage(); // один раз для всех тестов
});
```

**Экономия:** ~500-1000ms на тест × количество тестов

### 2. Дублирование моков API
```typescript
// ❌ Плохо - каждый тест настраивает моки заново
test("тест 1", async ({ page }) => {
  await helpers.mockCurrentUser(user);
  await helpers.mockListInvitations([]);
  // ...
});

test("тест 2", async ({ page }) => {
  await helpers.mockCurrentUser(user); // дубликат
  await helpers.mockListInvitations([]);
  // ...
});

// ✅ Хорошо - настройка моков в beforeEach
test.beforeEach(async ({ page }) => {
  await helpers.setupBasicMocks(currentUser); // батчинг
});
```

**Экономия:** ~100-200ms на тест

### 3. Медленные селекторы
```typescript
// ❌ Плохо - множественные варианты, .first(), .or()
await page.locator('button:has-text("Пригласить"), button:has-text("Добавить"), [data-testid="invite-button"]').first().click();

// ✅ Хорошо - приоритет data-testid
await page.locator('[data-testid="invite-button"]').click();
```

**Экономия:** ~50-100ms на селектор

### 4. Последовательное выполнение независимых операций
```typescript
// ❌ Плохо - последовательно
await page.fill('#email', 'test@example.com');
await page.selectOption('#role', 'admin');

// ✅ Хорошо - параллельно
await Promise.all([
  page.fill('#email', 'test@example.com'),
  page.selectOption('#role', 'admin'),
]);
```

**Экономия:** ~100-200ms на форму

### 5. Избыточные ожидания
```typescript
// ❌ Плохо - ждем каждый элемент
await expect(page.locator('#email')).toBeVisible();
await expect(page.locator('#password')).toBeVisible();
await expect(page.locator('button')).toBeVisible();

// ✅ Хорошо - ждем только критичные элементы
await page.locator('[role="dialog"]').waitFor();
```

**Экономия:** ~50-100ms на проверку

### 6. Большие таймауты
```typescript
// ❌ Плохо
navigationTimeout: 30000,
actionTimeout: 10000,

// ✅ Хорошо
navigationTimeout: 15000,
actionTimeout: 5000,
```

**Экономия:** Быстрее фейлятся сломанные тесты

### 7. Отсутствие параллелизации
```typescript
// ❌ Плохо
workers: process.env.CI ? 1 : undefined,

// ✅ Хорошо
workers: process.env.CI ? 2 : "50%",
fullyParallel: true,
```

**Экономия:** 2-4x ускорение общего времени

## Рекомендации по оптимизации

### Приоритет 1: Добавить data-testid во все компоненты

```tsx
// В компонентах добавить data-testid
<button data-testid="invite-button">Пригласить</button>
<input data-testid="email-input" type="email" />
<select data-testid="role-select" name="role" />
<div data-testid="success-message" role="status" />
<div data-testid="error-message" role="alert" />
<div data-testid="invitation-item">...</div>
<div data-testid="empty-invitations">...</div>
```

### Приоритет 2: Использовать оптимизированную конфигурацию

```bash
# Переименовать файлы
mv playwright.config.ts playwright.config.old.ts
mv playwright.config.optimized.ts playwright.config.ts
```

### Приоритет 3: Рефакторинг тестов

1. Переместить общие моки в `beforeEach`
2. Использовать `setupBasicMocks()` для батчинга
3. Заменить сложные селекторы на `data-testid`
4. Использовать `Promise.all()` для параллельных операций
5. Добавить `.parallel()` для независимых тестов

### Приоритет 4: Оптимизация навигации

```typescript
// Использовать waitUntil: 'domcontentloaded' вместо 'load'
await page.goto("/users", { waitUntil: "domcontentloaded" });
```

### Приоритет 5: Кеширование и переиспользование

```typescript
// Кешировать селекторы в классе helpers
private selectors = {
  inviteButton: '[data-testid="invite-button"]',
  emailInput: '[data-testid="email-input"]',
};
```

## Ожидаемые результаты

### До оптимизации
- Один тест: ~3-5 секунд
- 20 тестов: ~60-100 секунд (последовательно)
- 20 тестов: ~30-50 секунд (с 2 воркерами)

### После оптимизации
- Один тест: ~1-2 секунды (2-3x быстрее)
- 20 тестов: ~20-30 секунд (последовательно)
- 20 тестов: ~10-15 секунд (с 4 воркерами) (4-6x быстрее)

## Чеклист для каждого теста

- [ ] Используется `data-testid` вместо текстовых селекторов
- [ ] Общие моки вынесены в `beforeEach`
- [ ] Навигация происходит один раз в `beforeEach`
- [ ] Независимые операции выполняются параллельно через `Promise.all()`
- [ ] Минимальное количество `expect()` - только критичные проверки
- [ ] Используется `waitFor()` вместо `toBeVisible()` где возможно
- [ ] Тест может выполняться параллельно с другими (нет зависимостей)

## Быстрый старт

1. Применить оптимизированную конфигурацию:
```bash
cp playwright.config.optimized.ts playwright.config.ts
```

2. Использовать оптимизированные helpers:
```typescript
import { InvitationHelpers } from "../../helpers/invitation-helpers.optimized";
```

3. Добавить `data-testid` в компоненты (см. список выше)

4. Запустить тесты:
```bash
bun run test
```

## Дополнительные оптимизации

### Отключить ненужные функции браузера
```typescript
launchOptions: {
  args: [
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
  ],
}
```

### Использовать глобальную настройку для прогрева
```typescript
globalSetup: require.resolve('./global-setup'),
```

### Группировать похожие тесты
```typescript
test.describe.parallel("Роли", () => {
  // Эти тесты выполнятся параллельно
});
```

## Мониторинг производительности

```bash
# Запустить с отчетом о времени
bun run test --reporter=html

# Посмотреть отчет
bun run report
```

В отчете смотрите:
- Duration каждого теста
- Самые медленные тесты
- Flaky тесты (нестабильные)

## Итоговая экономия

| Оптимизация | Экономия на тест | Экономия на 20 тестов |
|-------------|------------------|------------------------|
| data-testid | 50-100ms | 1-2s |
| Батчинг моков | 100-200ms | 2-4s |
| beforeEach навигация | 500-1000ms | 10-20s |
| Promise.all | 100-200ms | 2-4s |
| Параллелизация | - | 2-4x ускорение |
| **ИТОГО** | **~2-3x быстрее** | **~4-6x быстрее** |
