# Чеклист действий для оптимизации

## Фаза 1: Конфигурация (5 минут)

- [ ] Сохранить текущую конфигурацию
  ```bash
  cd packages/e2e
  cp playwright.config.ts playwright.config.backup.ts
  ```

- [ ] Применить оптимизированную конфигурацию
  ```bash
  cp playwright.config.optimized.ts playwright.config.ts
  ```

- [ ] Проверить, что тесты запускаются
  ```bash
  bun run test
  ```

**Ожидаемый результат:** Тесты стали быстрее на ~30-40%

---

## Фаза 2: Добавление data-testid (30 минут)

### Компоненты приглашений

- [ ] Компонент модалки приглашения (найдите актуальный файл в кодовой базе)
  - [ ] `data-testid="invite-modal"` на Dialog
  - [ ] `data-testid="invite-button"` на кнопку открытия
  - [ ] `data-testid="email-tab"` на таб email
  - [ ] `data-testid="link-tab"` на таб ссылки
  - [ ] `data-testid="email-input"` на input email
  - [ ] `data-testid="role-select"` на select роли
  - [ ] `data-testid="submit-button"` на кнопку отправки
  - [ ] `data-testid="create-link-button"` на кнопку создания ссылки

- [ ] Компонент списка приглашений
  - [ ] `data-testid="invitations-list"` на контейнер
  - [ ] `data-testid="invitation-item"` на элемент списка
  - [ ] `data-testid="invitation-email"` на email
  - [ ] `data-testid="invitation-role"` на роль
  - [ ] `data-testid="invitation-expires"` на срок действия
  - [ ] `data-testid="empty-invitations"` на пустое состояние
  - [ ] `data-testid="revoke-invitation-button"` на кнопку отзыва
  - [ ] `data-testid="confirm-revoke-button"` на подтверждение
  - [ ] `data-testid="copy-link-button"` на кнопку копирования

- [ ] Компоненты сообщений
  - [ ] `data-testid="success-message"` на успешное сообщение
  - [ ] `data-testid="error-message"` на ошибку

### Страница принятия приглашения

- [ ] `apps/app/src/app/invite/[token]/page.tsx`
  - [ ] `data-testid="invitation-page"` на контейнер
  - [ ] `data-testid="register-form"` на форму регистрации
  - [ ] `data-testid="name-input"` на поле имени
  - [ ] `data-testid="password-input"` на поле пароля
  - [ ] `data-testid="register-button"` на кнопку регистрации
  - [ ] `data-testid="join-button"` на кнопку присоединения
  - [ ] `data-testid="login-button"` на кнопку входа
  - [ ] `data-testid="logout-button"` на кнопку выхода

**Ожидаемый результат:** Селекторы стали быстрее на ~50-100ms каждый

---

## Фаза 3: Обновление helpers (10 минут)

- [ ] Переименовать старые helpers
  ```bash
  cd packages/e2e/tests/helpers
  cp invitation-helpers.ts invitation-helpers.backup.ts
  ```

- [ ] Применить оптимизированные helpers
  ```bash
  cp invitation-helpers.optimized.ts invitation-helpers.ts
  ```

- [ ] Проверить импорты в тестах
  ```typescript
  // Должно быть:
  import { InvitationHelpers } from "../../helpers/invitation-helpers";
  ```

**Ожидаемый результат:** Helpers используют батчинг и кеширование

---

## Фаза 4: Обновление тестов (10 минут на файл)

### Файл: `invite-management.spec.ts`

- [ ] Добавить общую настройку в beforeEach
  ```typescript
  test.beforeEach(async ({ page }) => {
    helpers = new InvitationHelpers(page);
    currentUser = InvitationFactory.createMockUser();
    await helpers.setupBasicMocks(currentUser);
    await helpers.gotoUsersPage();
  });
  ```

- [ ] Упростить тесты, используя helpers
  ```typescript
  test("создает приглашение", async () => {
    await helpers.mockCreateInvitation(invitation);
    await helpers.openInviteModal();
    await helpers.fillInviteForm(email, role);
    await helpers.submitForm();
    await helpers.expectSuccess();
  });
  ```

- [ ] Заменить селекторы на data-testid
  ```typescript
  // Было:
  page.locator('button:has-text("Пригласить")').first()
  
  // Стало:
  page.locator('[data-testid="invite-button"]')
  ```

- [ ] Добавить параллелизацию для независимых тестов
  ```typescript
  test.describe.parallel("Роли", () => {
    // тесты
  });
  ```

### Файл: `invite-accept-flow.spec.ts`

- [ ] Повторить те же шаги
- [ ] Использовать оптимизированные helpers
- [ ] Заменить селекторы
- [ ] Добавить beforeEach

**Ожидаемый результат:** Каждый тест стал быстрее на ~500-1000ms

---

## Фаза 5: Проверка результатов (5 минут)

- [ ] Запустить все тесты
  ```bash
  bun run test
  ```

- [ ] Проверить отчет
  ```bash
  bun run report
  ```

- [ ] Убедиться в улучшениях:
  - [ ] Duration каждого теста <2s
  - [ ] Общее время уменьшилось в 3-4 раза
  - [ ] Нет flaky тестов
  - [ ] Все тесты проходят

---

## Фаза 6: Дополнительные оптимизации (опционально)

- [ ] Добавить Promise.all для параллельных операций
  ```typescript
  await Promise.all([
    page.fill('[data-testid="email-input"]', email),
    page.selectOption('[data-testid="role-select"]', role),
  ]);
  ```

- [ ] Уменьшить количество проверок
  ```typescript
  // Вместо множественных expect
  await page.locator('[role="dialog"]').waitFor();
  ```

- [ ] Добавить .parallel() для независимых групп тестов

---

## Метрики успеха

### До оптимизации
- [ ] Записать текущее время выполнения тестов
  - Один тест: _____ секунд
  - Все тесты: _____ секунд

### После оптимизации
- [ ] Записать новое время выполнения
  - Один тест: _____ секунд (ожидается 1-2s)
  - Все тесты: _____ секунд (ожидается 3-4x быстрее)

### Целевые показатели
- [ ] Один тест: <2 секунды
- [ ] 20 тестов: <15 секунд (параллельно)
- [ ] Нет flaky тестов
- [ ] Все тесты проходят

---

## Troubleshooting

### Тесты падают после добавления data-testid
- [ ] Проверить, что все data-testid добавлены в компоненты
- [ ] Проверить правильность написания (kebab-case)
- [ ] Убедиться, что компоненты рендерятся

### Тесты все еще медленные
- [ ] Проверить, что используется оптимизированная конфигурация
- [ ] Убедиться, что fullyParallel: true
- [ ] Проверить количество воркеров
- [ ] Посмотреть самые медленные тесты в отчете

### Flaky тесты
- [ ] Добавить явные ожидания: `await element.waitFor()`
- [ ] Проверить, что моки настроены до навигации
- [ ] Использовать `waitForLoadState('domcontentloaded')`

---

## Финальная проверка

- [ ] Все тесты проходят
- [ ] Время выполнения уменьшилось в 3-4 раза
- [ ] Нет flaky тестов
- [ ] Отчет показывает хорошие результаты
- [ ] Команда довольна результатом 🎉

---

## Следующие шаги

- [ ] Применить оптимизации к остальным тестам
- [ ] Добавить data-testid во все компоненты приложения
- [ ] Настроить CI для параллельного выполнения
- [ ] Мониторить производительность тестов

---

## Полезные команды

```bash
# Запустить тесты
bun run test

# Запустить с UI
bun run test:ui

# Запустить в режиме отладки
bun run test:debug

# Посмотреть отчет
bun run report

# Запустить только один файл
bun run test invite-management.spec.ts

# Запустить только один тест
bun run test -g "создает приглашение"
```

---

## Время на выполнение

| Фаза | Время | Результат |
|------|-------|-----------|
| 1. Конфигурация | 5 мин | +30-40% |
| 2. data-testid | 30 мин | +50-100ms на селектор |
| 3. Helpers | 10 мин | Батчинг и кеширование |
| 4. Тесты | 10 мин × N файлов | +500-1000ms на тест |
| 5. Проверка | 5 мин | Подтверждение |
| **ИТОГО** | **~60 мин** | **3-6x ускорение** |
