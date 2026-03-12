# React Hook Form + Zod в проекте

## ✅ Что добавлено

### 1. Зависимости
```bash
bun add react-hook-form @hookform/resolvers zod
```

### 2. Форма авторизации (обновлена)
- **Файл**: `apps/frontend/app/page.tsx`
- **Использует**: `useForm` с `zodResolver`
- **Валидация**: Email формат, минимальная длина пароля
- **Ошибки**: Real-time валидация с красивыми сообщениями

### 3. Схемы валидации Zod
- **Файл**: `apps/frontend/lib/validations.ts`
- **Включает**: 
  - `loginSchema` - форма входа
  - `createUserSchema` - создание пользователя
  - `updateUserSchema` - редактирование пользователя
  - `changePasswordSchema` - смена пароля
  - `reportSettingsSchema` - настройки отчетов

### 4. Пример формы UserForm
- **Файл**: `apps/frontend/components/UserForm.tsx`
- **Функционал**: Создание/редактирование пользователей
- **Валидация**: Полная с Zod
- **Стили**: Современные с Tailwind

### 5. Стили форм
- **Файл**: `apps/frontend/app/globals.css`
- **Добавлено**: Стили для валидации, ошибок, кнопок

## 🚀 Как использовать

### Базовая форма с react-hook-form + zod

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 1. Схема валидации
const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormData = z.infer<typeof schema>;

// 2. Компонент формы
export default function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    console.log(data);
    // API вызов
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          id="email"
          type="email"
          className={`form-control ${errors.email ? "is-invalid" : ""}`}
          {...register("email")}
        />
        {errors.email && (
          <div className="form-error">{errors.email.message}</div>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Отправка..." : "Отправить"}
      </button>
    </form>
  );
}
```

### Использование готовых схем

```typescript
import { loginSchema, type LoginFormData } from "@/lib/validations";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

## 📋 Доступные схемы валидации

### 1. loginSchema
```typescript
{
  username: string (email, required)
  password: string (min 6, required)
}
```

### 2. createUserSchema
```typescript
{
  username: string (email, required)
  password: string (min 6, 1 uppercase, 1 lowercase, 1 digit)
  confirmPassword: string (must match password)
  first_name: string (required)
  last_name: string (optional)
  internal_numbers: string (optional)
  mobile_numbers: string (optional)
}
```

### 3. updateUserSchema
```typescript
{
  first_name: string (optional)
  last_name: string (optional)
  internal_numbers: string (optional)
  mobile_numbers: string (optional)
  email: string (email, optional)
  is_active: boolean (optional)
}
```

## 🎨 Стили форм

### CSS классы
- `.form-control` - базовый инпут
- `.form-control.is-invalid` - инпут с ошибкой
- `.form-error` - сообщение об ошибке
- `.form-group` - группа поля
- `.form-label` - лейбл
- `.btn` - базовая кнопка
- `.btn-primary` - основная кнопка
- `.btn-secondary` - вторичная кнопка

### Пример использования стилей
```html
<div className="form-group">
  <label htmlFor="email" className="form-label">Email</label>
  <input
    id="email"
    className={`form-control ${errors.email ? "is-invalid" : ""}`}
    {...register("email")}
  />
  {errors.email && (
    <div className="form-error">{errors.email.message}</div>
  )}
</div>
```

## 🔧 Интеграция с API

### Пример с oRPC API
```typescript
import { usersApi } from "@/lib/api-orpc";

const onSubmit = async (data: CreateUserData) => {
  try {
    await usersApi.create(data);
    // Успех
  } catch (err) {
    // Обработка ошибки
    setError("root", { message: "Ошибка создания пользователя" });
  }
};
```

## 📝 Лучшие практики

### 1. Всегда используйте TypeScript
```typescript
type FormData = z.infer<typeof schema>;
```

### 2. Валидация на blur
```typescript
useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onBlur", // Валидация при потере фокуса
});
```

### 3. Правильные лейблы
```html
<label htmlFor="email" className="form-label">Email</label>
<input id="email" {...register("email")} />
```

### 4. Состояние загрузки
```typescript
const { isSubmitting } = formState;
<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Загрузка..." : "Отправить"}
</button>
```

### 5. Обработка ошибок
```typescript
try {
  await apiCall(data);
} catch (err: unknown) {
  const message = (err as any)?.response?.data?.detail || "Ошибка";
  setError("root", { message });
}
```

## 🔄 Миграция существующих форм

### Старый код (useState):
```typescript
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [errors, setErrors] = useState({});

const handleSubmit = (e) => {
  e.preventDefault();
  // Ручная валидация...
};
```

### Новый код (react-hook-form):
```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(schema),
});

const onSubmit = (data) => {
  // Автоматическая валидация!
};
```

## 🎯 Преимущества

1. **Type Safety**: Полная типизация
2. **Автоматическая валидация**: Zod схемы
3. **Real-time ошибки**: Сразу при вводе
4. **Меньше кода**: Нет ручного стейта
5. **Performance**: Оптимизированные ререндеры
6. **Accessibility**: Правильные лейблы
7. **UX**: Красивые сообщения об ошибках

## 📚 Дополнительные ресурсы

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Docs](https://zod.dev/)
- [@hookform/resolvers](https://github.com/react-hook-form/resolvers)

**Формы в проекте теперь используют лучшие практики!** 🎉
