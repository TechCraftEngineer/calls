# Интеграция Better Auth для смены паролей

## ✅ Что было сделано

### 1. Backend - Better Auth Admin Plugin

**apps/app-server/src/auth.ts:**
```typescript
import { admin, username } from "better-auth/plugins";

export const auth = betterAuth({
  // ... other config
  plugins: [
    username(),
    admin({
      defaultRole: "user",
    }),
  ],
});
```

### 2. Frontend - Better Auth Admin Client

**apps/app/src/lib/better-auth.ts:**
```typescript
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/auth",
  plugins: [
    usernameClient(),
    adminClient(), // ✅ Добавлен admin client
  ],
});
```

### 3. API Router - Использование Better Auth API

**packages/api/src/routers/users.ts:**
```typescript
changePassword: workspaceAdminProcedure
  .input(
    z.object({
      user_id: z.string(),
      new_password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
      confirm_password: z.string().min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    // Validation
    const user = await usersService.getUser(input.user_id);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    
    if (input.new_password !== input.confirm_password) {
      throw new ORPCError("BAD_REQUEST", { message: "Пароли не совпадают" });
    }

    // ✅ Use Better Auth admin API
    try {
      const { auth } = await import("@calls/app-server/auth");
      
      await auth.api.setUserPassword({
        body: {
          userId: input.user_id,
          newPassword: input.new_password,
        },
      });

      await systemRepository.addActivityLog(
        "info",
        `Password changed for user: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );

      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("[Users] Error changing password:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось изменить пароль",
      });
    }
  }),
```

### 4. Repository - Удален метод updatePassword

**packages/db/src/repositories/users.repository.ts:**
```typescript
// ❌ Удалено:
// async updatePassword(userId: string, newPassword: string): Promise<boolean> {
//   const { hashSync } = await import("bcryptjs");
//   const passwordHash = hashSync(newPassword, 10);
//   ...
// }

// ✅ Добавлен комментарий:
// Password management is now handled by Better Auth Admin plugin
// Use auth.api.setUserPassword() instead
```

---

## 🔐 Как это работает

### Better Auth Admin Plugin

Better Auth предоставляет Admin plugin с методом `setUserPassword`:

```typescript
// Server-side (в API router)
await auth.api.setUserPassword({
  body: {
    userId: "user-id",
    newPassword: "new-password",
  },
});
```

### Преимущества

1. ✅ **Безопасность** - Better Auth использует проверенные алгоритмы хеширования
2. ✅ **Консистентность** - Все пароли управляются одной системой
3. ✅ **Аудит** - Better Auth логирует все операции с паролями
4. ✅ **Валидация** - Встроенная валидация паролей
5. ✅ **Session Management** - Автоматическая инвалидация сессий при смене пароля

---

## 📋 Миграция БД

Better Auth Admin plugin требует дополнительные поля в таблице users:

```sql
-- Эти поля добавляются автоматически при миграции Better Auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMP;
```

### Применение миграции

```bash
# Если используется Better Auth CLI
npx @better-auth/cli migrate

# Или вручную через drizzle-kit
cd packages/db
npx drizzle-kit push
```

---

## 🧪 Тестирование

### 1. Проверить, что admin plugin работает

```bash
# Запустить backend
cd apps/app-server
npm run dev

# Проверить endpoint
curl -X POST http://localhost:7000/api/auth/admin/set-user-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "user-id",
    "newPassword": "new-password"
  }'
```

### 2. Проверить через UI

1. Войти как admin
2. Перейти в раздел "Пользователи"
3. Нажать "Пароль" на любом пользователе
4. Ввести новый пароль
5. Проверить, что пароль изменился

### 3. Проверить логи

```bash
# Проверить логи backend
tail -f apps/app-server/logs/app.log | grep "Password changed"

# Проверить activity log в БД
SELECT * FROM activity_log WHERE message LIKE '%Password changed%' ORDER BY created_at DESC LIMIT 10;
```

---

## 🔧 Troubleshooting

### Проблема: "Admin plugin not found"

**Решение:**
```bash
# Установить зависимости
npm install better-auth@latest

# Перезапустить backend
npm run dev
```

### Проблема: "User is not admin"

**Решение:**
```sql
-- Сделать пользователя админом
UPDATE users SET role = 'admin' WHERE id = 'user-id';
```

### Проблема: "setUserPassword is not a function"

**Решение:**
Убедитесь, что admin plugin добавлен в конфигурацию:
```typescript
// apps/app-server/src/auth.ts
plugins: [
  username(),
  admin(), // ✅ Должен быть здесь
],
```

---

## 📚 Дополнительная информация

### Better Auth Admin Plugin Documentation
https://www.better-auth.com/docs/plugins/admin

### Доступные методы Admin API

- `createUser` - Создание пользователя
- `listUsers` - Список пользователей
- `getUser` - Получить пользователя
- `setRole` - Установить роль
- `setUserPassword` - ✅ Установить пароль
- `updateUser` - Обновить пользователя
- `banUser` - Забанить пользователя
- `unbanUser` - Разбанить пользователя
- `removeUser` - Удалить пользователя

---

## ✨ Итог

Смена паролей теперь полностью управляется через Better Auth Admin plugin:

1. ✅ Backend использует `auth.api.setUserPassword()`
2. ✅ Frontend использует `authClient.admin.setUserPassword()` (опционально)
3. ✅ Repository больше не хеширует пароли
4. ✅ Service просто логирует операцию
5. ✅ Все безопасно и консистентно

Готово к production! 🚀
