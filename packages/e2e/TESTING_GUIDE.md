# Руководство по E2E тестированию

## Лучшие практики

### 1. Структура тестов

```typescript
test.describe('Группа тестов', () => {
  test.beforeEach(async ({ page }) => {
    // Подготовка перед каждым тестом
    await page.goto('/auth/signin');
  });

  test('описательное название теста', async ({ page }) => {
    // Тест должен быть понятным и независимым
  });
});
```

### 2. Использование фикстур

```typescript
import { test, expect } from '../fixtures/auth';

test('тест с фикстурами', async ({ page, validUser }) => {
  await page.fill('#email', validUser.email);
  await page.fill('#password', validUser.password);
});
```

### 3. Использование помощников

```typescript
import { AuthHelpers } from '../helpers/auth-helpers';

test('тест с помощниками', async ({ page }) => {
  const authHelpers = new AuthHelpers(page);
  await authHelpers.fillSignInForm(validUser);
  await authHelpers.expectSuccessMessage('Успех!');
});
```

## Селекторы

### Приоритет селекторов:
1. `data-testid` - лучший выбор для тестов
2. `id` - хорошо для уникальных элементов
3. `role` и ARIA атрибуты - для доступности
4. `text` - для контента
5. CSS классы - только если нет альтернатив

```typescript
// ✅ Хорошо
await page.locator('[data-testid="login-button"]').click();
await page.locator('#email').fill('test@example.com');
await page.locator('button[type="submit"]').click();

// ❌ Плохо
await page.locator('.btn-primary.auth-btn').click();
```

## Ожидания (Assertions)

### Используйте автоматические ожидания:

```typescript
// ✅ Хорошо - автоматически ждёт появления элемента
await expect(page.locator('#email')).toBeVisible();

// ❌ Плохо - может быть нестабильным
await page.waitForTimeout(1000);
expect(await page.locator('#email').isVisible()).toBe(true);
```

### Проверяйте состояния, а не только наличие:

```typescript
// ✅ Хорошо
await expect(page.locator('button[type="submit"]')).toBeEnabled();
await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'false');

// ❌ Недостаточно
await expect(page.locator('button[type="submit"]')).toBeVisible();
```

## Мокирование API

### Мокирование успешных ответов:

```typescript
await page.route('**/api/auth/**', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, user: { id: 1 } })
  });
});
```

### Мокирование ошибок:

```typescript
await page.route('**/api/auth/**', async route => {
  await route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Unauthorized' })
  });
});
```

## Отладка тестов

### 1. Использование отладчика:

```bash
bun run test:debug
```

### 2. Скриншоты при ошибках:

```typescript
test('тест с скриншотом', async ({ page }) => {
  try {
    // тест
  } catch (error) {
    await page.screenshot({ path: 'error-screenshot.png' });
    throw error;
  }
});
```

### 3. Трейсинг:

```typescript
// В playwright.config.ts
use: {
  trace: 'on-first-retry', // или 'on'
}
```

## Тестирование доступности

### Проверка ARIA атрибутов:

```typescript
test('доступность формы', async ({ page }) => {
  await page.goto('/auth/signin');
  
  // Проверяем labels
  await expect(page.locator('label[for="email"]')).toBeVisible();
  
  // Проверяем aria-invalid при ошибках
  await page.click('button[type="submit"]');
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
});
```

### Клавиатурная навигация:

```typescript
test('навигация с клавиатуры', async ({ page }) => {
  await page.goto('/auth/signin');
  
  await page.keyboard.press('Tab');
  await expect(page.locator('#email')).toBeFocused();
  
  await page.keyboard.press('Tab');
  await expect(page.locator('#password')).toBeFocused();
});
```

## Тестирование на разных устройствах

```typescript
test('мобильная версия', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/auth/signin');
  
  // Проверяем, что элементы доступны на мобильных
  const buttonBox = await page.locator('button[type="submit"]').boundingBox();
  expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
});
```

## Производительность

### Измерение времени загрузки:

```typescript
test('производительность', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/auth/signin');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000);
});
```

## Частые ошибки

### 1. Не используйте фиксированные задержки:

```typescript
// ❌ Плохо
await page.waitForTimeout(1000);

// ✅ Хорошо
await page.waitForSelector('#element');
await expect(page.locator('#element')).toBeVisible();
```

### 2. Не полагайтесь на порядок выполнения:

```typescript
// ❌ Плохо - может быть нестабильным
test('тест 1', () => { /* создаёт данные */ });
test('тест 2', () => { /* использует данные из теста 1 */ });

// ✅ Хорошо - каждый тест независим
test('тест 1', () => { /* создаёт и использует свои данные */ });
test('тест 2', () => { /* создаёт и использует свои данные */ });
```

### 3. Очищайте состояние между тестами:

```typescript
test.beforeEach(async ({ page }) => {
  // Очищаем localStorage, cookies и т.д.
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});
```

## Запуск тестов

```bash
# Все тесты
bun run test

# Только тесты аутентификации
bun run test:auth

# С UI для отладки
bun run test:ui

# В режиме отладки
bun run test:debug

# С видимыми браузерами
bun run test:headed
```