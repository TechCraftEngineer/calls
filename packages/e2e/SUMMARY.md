# Сводка: Оптимизация E2E тестов

## Найденные проблемы

1. **Повторяющиеся переходы** - каждый тест делает `page.goto()` → ~500-1000ms потерь
2. **Дублирование моков** - каждый тест настраивает одни и те же моки → ~100-200ms потерь
3. **Медленные селекторы** - `.first()`, `.or()`, поиск по тексту → ~50-100ms на селектор
4. **Последовательное выполнение** - нет параллелизации → 2-4x медленнее
5. **Большие таймауты** - 30s навигация, 10s действия → медленные фейлы
6. **Отсутствие data-testid** - поиск элементов по тексту медленнее

## Созданные файлы

### 1. `playwright.config.optimized.ts`
Оптимизированная конфигурация:
- Параллелизация: `workers: "50%"`
- Уменьшенные таймауты: 15s навигация, 5s действия
- Отключение ненужных функций браузера
- Глобальная настройка для прогрева

### 2. `global-setup.ts`
Прогрев сервера перед тестами

### 3. `tests/helpers/invitation-helpers.optimized.ts`
Оптимизированные helpers:
- Кеширование селекторов
- Батчинг API моков через `setupBasicMocks()`
- Использование `data-testid`
- Параллельные операции через `Promise.all()`

### 4. `tests/workspaces/invitations/invite-management.optimized.spec.ts`
Пример оптимизированного теста:
- Общие моки в `beforeEach`
- Один переход на страницу
- Использование `data-testid`
- Параллельное выполнение тестов ролей

### 5. `PERFORMANCE_OPTIMIZATION.md`
Детальное описание всех проблем и решений

### 6. `DATA_TESTID_CHECKLIST.md`
Полный список `data-testid` для добавления в компоненты

### 7. `QUICK_START_OPTIMIZATION.md`
Пошаговая инструкция по применению оптимизаций

## Ожидаемые результаты

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| Один тест | 3-5s | 1-2s | **2-3x быстрее** |
| 20 тестов (последовательно) | 60-100s | 20-30s | **3-4x быстрее** |
| 20 тестов (параллельно) | 30-50s | 10-15s | **4-6x быстрее** |

## Что нужно сделать

### Шаг 1: Применить конфигурацию (5 минут)
```bash
cd packages/e2e
mv playwright.config.ts playwright.config.backup.ts
mv playwright.config.optimized.ts playwright.config.ts
```

### Шаг 2: Добавить data-testid (30 минут)
Открыть компоненты и добавить атрибуты:
- `data-testid="invite-button"`
- `data-testid="email-input"`
- `data-testid="role-select"`
- `data-testid="submit-button"`
- `data-testid="success-message"`
- `data-testid="error-message"`
- `data-testid="invitation-item"`

Полный список в `DATA_TESTID_CHECKLIST.md`

### Шаг 3: Обновить тесты (10 минут на файл)
```typescript
// Использовать оптимизированные helpers
import { InvitationHelpers } from "../../helpers/invitation-helpers.optimized";

// Настроить общее состояние
test.beforeEach(async ({ page }) => {
  helpers = new InvitationHelpers(page);
  await helpers.setupBasicMocks(user);
  await helpers.gotoUsersPage();
});

// Упростить тесты
test("создает приглашение", async () => {
  await helpers.mockCreateInvitation(invitation);
  await helpers.openInviteModal();
  await helpers.fillInviteForm(email, role);
  await helpers.submitForm();
  await helpers.expectSuccess();
});
```

## Приоритет файлов для оптимизации

1. **Высокий** - тесты приглашений (invite-management.spec.ts, invite-accept-flow.spec.ts)
2. **Средний** - тесты аутентификации
3. **Низкий** - остальные тесты

## Проверка результатов

```bash
# Запустить тесты
bun run test

# Посмотреть отчет
bun run report
```

Проверить в отчете:
- Duration каждого теста <2s
- Общее время уменьшилось в 3-4 раза
- Нет flaky тестов

## Дополнительные улучшения

1. **Параллелизация** - добавить `.parallel()` для независимых тестов
2. **Promise.all** - выполнять независимые операции параллельно
3. **Меньше проверок** - проверять только критичные элементы
4. **Кеширование** - переиспользовать состояние между тестами

## Контакты для вопросов

См. файлы:
- `QUICK_START_OPTIMIZATION.md` - быстрый старт
- `PERFORMANCE_OPTIMIZATION.md` - детали
- `DATA_TESTID_CHECKLIST.md` - список атрибутов
