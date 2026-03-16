# 🔍 Тестирование исправления установки пароля

## Проблема
При принятии приглашения пароль не устанавливался пользователям в таблице accounts через Better Auth.

## ✅ Исправленная логика

### Для существующих пользователей:
- **Проверяем наличие credential аккаунта** через `findAccounts(userId)`
- **Если аккаунт есть** → ничего не делаем, пароль уже установлен
- **Если аккаунта нет** → создаем новый credential аккаунт с паролем

### Для новых пользователей:
- **Всегда создаем** credential аккаунт через `linkAccount`

## Ключевые исправления

### 1. ✅ Правильная логика проверки пароля
```typescript
const credentialAccount = accounts.find((a) => a.providerId === "credential");

if (credentialAccount) {
  // Пользователь уже имеет пароль - ничего не делаем
  logger.info("User already has credential account - skipping password setup");
  return;
}

// Создаем новый credential аккаунт
await internalAdapter.linkAccount({...});
```

### 2. ✅ Убрана лишняя логика обновления пароля
- Удален `setUserPassword` и `updatePassword` для существующих пользователей
- Пароль только создается для тех, у кого его еще нет

### 3. ✅ Детальное логирование
- Логируем все найденные аккаунты пользователя
- Логируем решение о создании/пропуске пароля

## Как протестировать

### Сценарий 1: Существующий пользователь БЕЗ пароля
1. Создать пользователя в системе (без пароля)
2. Пригласить его в workspace
3. Принять приглашение с паролем
4. **Ожидаемый результат:** создается credential аккаунт

### Сценарий 2: Существующий пользователь С паролем
1. Создать пользователя с паролем
2. Пригласить его в workspace  
3. Принять приглашение (с любым паролем)
4. **Ожидаемый результат:** ничего не меняется, пароль сохраняется

### Сценарий 3: Новый пользователь
1. Пригласить новый email
2. Принять приглашение с паролем
3. **Ожидаемый результат:** создается пользователь + credential аккаунт

## Проверка логов

Искать сообщения:
```
[InvitationsService] Checking password setup for existing user: {userId}
[InvitationsService] User already has credential account - skipping password setup
```

Или:
```
[InvitationsService] Creating new credential account for existing user: {userId}
[InvitationsService] Successfully created credential account for existing user: {userId}
```

## Проверка в БД
```sql
-- Проверить наличие credential аккаунта
SELECT * FROM accounts 
WHERE user_id = '{userId}' AND provider_id = 'credential';
```

## Ожидаемый результат
- ✅ Существующим пользователям с паролем ничего не меняется
- ✅ Существующим пользователям без пароля создается credential аккаунт
- ✅ Новым пользователям создается пользователь + credential аккаунт
- ✅ Нет попыток обновления существующих паролей
