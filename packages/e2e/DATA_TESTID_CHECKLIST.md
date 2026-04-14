# Чеклист data-testid для компонентов

## Приглашения (Invitations)

### Модальное окно создания приглашения
- [ ] `data-testid="invite-modal"` - само модальное окно
- [ ] `data-testid="invite-button"` - кнопка открытия модального окна
- [ ] `data-testid="email-tab"` - таб для email-приглашений
- [ ] `data-testid="link-tab"` - таб для ссылок-приглашений
- [ ] `data-testid="email-input"` - поле ввода email
- [ ] `data-testid="role-select"` - селектор роли
- [ ] `data-testid="submit-button"` - кнопка отправки формы
- [ ] `data-testid="create-link-button"` - кнопка создания ссылки
- [ ] `data-testid="cancel-button"` - кнопка отмены

### Список приглашений
- [ ] `data-testid="invitations-list"` - контейнер списка
- [ ] `data-testid="invitation-item"` - элемент приглашения
- [ ] `data-testid="invitation-email"` - email в приглашении
- [ ] `data-testid="invitation-role"` - роль в приглашении
- [ ] `data-testid="invitation-expires"` - срок действия
- [ ] `data-testid="invitation-status"` - статус приглашения
- [ ] `data-testid="empty-invitations"` - пустое состояние
- [ ] `data-testid="invite-link"` - ссылка приглашения
- [ ] `data-testid="copy-link-button"` - кнопка копирования ссылки
- [ ] `data-testid="revoke-invitation-button"` - кнопка отзыва
- [ ] `data-testid="confirm-revoke-button"` - подтверждение отзыва

### Сообщения
- [ ] `data-testid="success-message"` - успешное сообщение
- [ ] `data-testid="error-message"` - сообщение об ошибке
- [ ] `data-testid="loading-spinner"` - индикатор загрузки

## Страница принятия приглашения

### Общие элементы
- [ ] `data-testid="invitation-page"` - контейнер страницы
- [ ] `data-testid="workspace-name"` - название workspace
- [ ] `data-testid="invitation-role"` - роль в приглашении
- [ ] `data-testid="loading-state"` - состояние загрузки

### Форма регистрации (register-new)
- [ ] `data-testid="register-form"` - форма регистрации
- [ ] `data-testid="name-input"` - поле имени
- [ ] `data-testid="email-input"` - поле email
- [ ] `data-testid="password-input"` - поле пароля
- [ ] `data-testid="register-button"` - кнопка регистрации

### Форма входа (login-existing)
- [ ] `data-testid="login-prompt"` - подсказка о входе
- [ ] `data-testid="login-button"` - кнопка входа
- [ ] `data-testid="register-link"` - ссылка на регистрацию

### Кнопка присоединения (join-button)
- [ ] `data-testid="join-button"` - кнопка присоединения
- [ ] `data-testid="user-info"` - информация о пользователе

### Создание пароля (create-password-then-join)
- [ ] `data-testid="password-form"` - форма пароля
- [ ] `data-testid="password-input"` - поле пароля
- [ ] `data-testid="set-password-button"` - кнопка установки пароля

### Ошибка несовпадения email (wrong-email)
- [ ] `data-testid="wrong-email-error"` - сообщение об ошибке
- [ ] `data-testid="invited-email"` - email из приглашения
- [ ] `data-testid="current-email"` - текущий email пользователя
- [ ] `data-testid="logout-button"` - кнопка выхода

### Ошибки
- [ ] `data-testid="expired-invitation"` - истекшее приглашение
- [ ] `data-testid="invalid-invitation"` - недействительное приглашение
- [ ] `data-testid="error-container"` - контейнер ошибки

## Пример использования в компонентах

### React компонент
```tsx
// Модальное окно приглашения
<Dialog data-testid="invite-modal">
  <DialogContent>
    <Tabs>
      <TabsList>
        <TabsTrigger data-testid="email-tab" value="email">
          Email
        </TabsTrigger>
        <TabsTrigger data-testid="link-tab" value="link">
          Ссылка
        </TabsTrigger>
      </TabsList>
    </Tabs>
    
    <form>
      <Input
        data-testid="email-input"
        type="email"
        name="email"
      />
      
      <Select data-testid="role-select" name="role">
        <option value="admin">Администратор</option>
        <option value="member">Участник</option>
      </Select>
      
      <Button data-testid="submit-button" type="submit">
        Отправить
      </Button>
    </form>
  </DialogContent>
</Dialog>

// Список приглашений
<div data-testid="invitations-list">
  {invitations.length === 0 ? (
    <div data-testid="empty-invitations">
      Нет приглашений
    </div>
  ) : (
    invitations.map((inv) => (
      <div key={inv.id} data-testid="invitation-item">
        <span data-testid="invitation-email">{inv.email}</span>
        <span data-testid="invitation-role">{inv.role}</span>
        <Button
          data-testid="revoke-invitation-button"
          onClick={() => handleRevoke(inv.id)}
        >
          Отменить
        </Button>
      </div>
    ))
  )}
</div>

// Сообщения
{success && (
  <div data-testid="success-message" role="status">
    {success}
  </div>
)}

{error && (
  <div data-testid="error-message" role="alert">
    {error}
  </div>
)}
```

## Правила именования data-testid

1. Используйте kebab-case: `data-testid="invite-button"`
2. Будьте описательными: `data-testid="create-link-button"` вместо `data-testid="button"`
3. Группируйте по функциональности: `invitation-email`, `invitation-role`, `invitation-status`
4. Для списков используйте единственное число: `invitation-item` (не `invitation-items`)
5. Для состояний используйте суффиксы: `-loading`, `-error`, `-success`, `-empty`

## Приоритет применения

### Высокий приоритет (сделать в первую очередь)
1. Кнопки действий (`invite-button`, `submit-button`, `revoke-button`)
2. Поля ввода (`email-input`, `password-input`, `name-input`)
3. Сообщения (`success-message`, `error-message`)
4. Элементы списков (`invitation-item`)

### Средний приоритет
1. Контейнеры (invite-modal, invitations-list)
2. Табы и навигация (email-tab, link-tab)
3. Информационные элементы (invitation-email, invitation-role)

### Низкий приоритет
1. Декоративные элементы
2. Статические тексты
3. Иконки (если не являются кнопками)

## Проверка покрытия

После добавления data-testid запустите:

```bash
# Проверить, что все тесты проходят
bun run test

# Посмотреть отчет
bun run report
```

Убедитесь, что:
- Все селекторы в тестах используют `data-testid` в первую очередь
- Fallback селекторы (по тексту) оставлены для совместимости
- Тесты стали быстрее на 2-3x
