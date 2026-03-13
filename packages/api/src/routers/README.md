# API Routers Structure

Улучшенная структура роутеров - каждый роутер в отдельном файле:

```
src/routers/
├── index.ts                    # Главный экспорт всех роутеров
├── auth.ts                     # Аутентификация (логин, логаут, проверка email)
├── user-profile.ts             # Профиль текущего пользователя
├── users.ts                    # Управление пользователями (CRUD)
├── calls.ts                    # Основные операции со звонками
├── recommendations.ts          # Логика генерации рекомендаций
├── recommendations-router.ts   # Роутер для рекомендаций
├── reports.ts                  # Отчеты (тестовые сообщения и др.)
├── statistics.ts               # Статистика и метрики
├── settings.ts                 # Настройки системы
├── integrations.ts             # Интеграции (Telegram, MAX)
└── README.md                   # Документация
```

## Основные улучшения:

1. **Максимальная модульность** - каждый роутер в отдельном файле
2. **Четкое разделение ответственности** - каждый файл专注 на одной области
3. **Простая навигация** - легко найти нужный роутер по имени файла
4. **Гибкий импорт** - можно импортировать только нужные роутеры
5. **Масштабируемость** - легко добавлять новые роутеры

## Использование:

```typescript
// Импорт всех роутеров
import { 
  authRouter, 
  userProfileRouter, 
  usersRouter, 
  callsRouter, 
  recommendationsRouter,
  reportsRouter, 
  statisticsRouter,
  settingsRouter,
  integrationsRouter 
} from "./routers";

// Или импорт отдельных роутеров
import { authRouter, userProfileRouter } from "./routers";
import { callsRouter } from "./routers/calls";
```

## Описание роутеров:

- **auth.ts** - login, logout, checkEmail
- **user-profile.ts** - получение данных текущего пользователя
- **users.ts** - CRUD операции с пользователями
- **calls.ts** - список, получение, удаление звонков
- **recommendations.ts** - логика генерации рекомендаций AI
- **recommendations-router.ts** - эндпоинт для рекомендаций
- **reports.ts** - отчеты и тестовые функции
- **statistics.ts** - статистика и метрики системы
- **settings.ts** - управление настройками и промптами
- **integrations.ts** - интеграции с внешними сервисами
