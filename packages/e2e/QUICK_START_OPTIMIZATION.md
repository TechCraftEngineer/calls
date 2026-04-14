# Быстрый старт: Оптимизация E2E тестов

## Проблема
Тесты выполняются медленно из-за:
- Повторяющихся переходов на страницы
- Дублирования API моков
- Медленных селекторов без `data-testid`
- Последовательного выполнения
- Больших таймаутов

## Решение за 3 шага

### Шаг 1: Применить оптимизированную конфигурацию (5 минут)

```bash
cd packages/e2e

# Сохранить старую конфигурацию
mv playwright.config.ts playwright.config.backup.ts

# Применить новую
mv playwright.config.optimized.ts playwright.config.ts

# Проверить
bun run test
```

**Результат:** Тесты станут быстрее на ~30-40%

### Шаг 2: Добавить data-testid в компоненты (30 минут)

Откройте файлы компонентов и добавьте атрибуты:

```tsx
// Компонент модалки приглашения (найдите актуальный файл в вашей кодовой базе)
<Dialog data-testid="invite-modal">
  <Button data-testid="invite-button">Пригласить</Button>
  <Input data-testid="email-input" type="email" />
  <Select data-testid="role-select" name="role" />
  <Button data-testid="submit-button" type="submit">Отправить</Button>
</Dialog>

// Список приглашений
<div data-testid="invitations-list">
  {invitations.map(inv => (
    <div key={inv.id} data-testid="invitation-item">
      <span data-testid="invitation-email">{inv.email}</span>
      <span data-testid="invitation-role">{inv.role}</span>
      <Button data-testid="revoke-invitation-button">Отменить</Button>
    </div>
  ))}
</div>

// Сообщения
<div data-testid="success-message" role="status">{success}</div>
<div data-testid="error-message" role="alert">{error}</div>
```

Полный список в `DATA_TESTID_CHECKLIST.md`

**Результат:** Селекторы станут быстрее на ~50-100ms каждый

### Шаг 3: Использовать оптимизированные helpers (10 минут)

В тестах замените импорт:

```typescript
// Было
import { InvitationHelpers } from "../../helpers/invitation-helpers";

// Стало
import { InvitationHelpers } from "../../helpers/invitation-helpers.optimized";
```

И используйте новые методы:

```typescript
test.beforeEach(async ({ page }) => {
  helpers = new InvitationHelpers(page);
  const user = InvitationFactory.createMockUser();
  
  // Батчинг моков
  await helpers.setupBasicMocks(user);
  
  // Один переход для всех тестов
  await helpers.gotoUsersPage();
});

test("создает приглашение", async () => {
  const invitation = InvitationFactory.createEmailInvitation();
  await helpers.mockCreateInvitation(invitation);
  
  await helpers.openInviteModal();
  await helpers.fillInviteForm(invitation.email!, "member");
  await helpers.submitForm();
  
  await helpers.expectSuccess();
});
```

**Результат:** Каждый тест станет быстрее на ~500-1000ms

## Итоговый результат

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| Один тест | 3-5s | 1-2s | 2-3x |
| 20 тестов (последовательно) | 60-100s | 20-30s | 3-4x |
| 20 тестов (параллельно) | 30-50s | 10-15s | 4-6x |

## Проверка результатов

```bash
# Запустить тесты с отчетом
bun run test --reporter=html

# Посмотреть отчет
bun run report
```

В отчете проверьте:
- Duration каждого теста должен быть <2s
- Общее время выполнения уменьшилось в 3-4 раза
- Нет flaky тестов

## Дополнительные оптимизации (опционально)

### Параллелизация независимых тестов

```typescript
test.describe.parallel("Роли", () => {
  test("admin", async () => { /* ... */ });
  test("member", async () => { /* ... */ });
});
```

### Использование Promise.all для параллельных операций

```typescript
// Было
await page.fill('#email', 'test@example.com');
await page.selectOption('#role', 'admin');

// Стало
await Promise.all([
  page.fill('#email', 'test@example.com'),
  page.selectOption('#role', 'admin'),
]);
```

### Уменьшение количества проверок

```typescript
// Было
await expect(page.locator('#email')).toBeVisible();
await expect(page.locator('#password')).toBeVisible();
await expect(page.locator('button')).toBeVisible();

// Стало - проверяем только критичное
await page.locator('[role="dialog"]').waitFor();
```

## Troubleshooting

### Тесты падают после оптимизации

1. Проверьте, что все `data-testid` добавлены в компоненты
2. Убедитесь, что моки настроены в `beforeEach`
3. Проверьте таймауты - возможно нужно увеличить для медленных операций

### Тесты все еще медленные

1. Проверьте, что используется оптимизированная конфигурация
2. Убедитесь, что `fullyParallel: true`
3. Проверьте количество воркеров: `workers: "50%"`
4. Посмотрите самые медленные тесты в отчете и оптимизируйте их

### Flaky тесты (нестабильные)

1. Добавьте явные ожидания: `await element.waitFor()`
2. Проверьте, что моки настроены до навигации
3. Используйте `page.waitForLoadState('domcontentloaded')`

## Следующие шаги

1. Примените оптимизации ко всем тестам в `packages/e2e/tests/`
2. Добавьте `data-testid` во все компоненты приложения
3. Настройте CI для параллельного выполнения тестов
4. Мониторьте производительность тестов в отчетах

## Полезные ссылки

- [`PERFORMANCE_OPTIMIZATION.md`](./PERFORMANCE_OPTIMIZATION.md) - детальное описание всех оптимизаций
- [`DATA_TESTID_CHECKLIST.md`](./DATA_TESTID_CHECKLIST.md) - полный список data-testid для добавления
- [`playwright.config.ts`](./playwright.config.ts) - оптимизированная конфигурация
- [`tests/helpers/invitation-helpers.optimized.ts`](./tests/helpers/invitation-helpers.optimized.ts) - оптимизированные helpers
