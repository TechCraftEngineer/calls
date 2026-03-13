---
description: Правила управления Gig-ами, включая архитектуру состояний, статусы и бизнес-логику
alwaysApply: false
inclusion: fileMatch
fileMatchPattern: "**/gigs/**/*.{ts,tsx}"
---

# Правила управления Gig-ами

## Архитектура состояний

### Статусы Gig

```typescript
type GigStatus =
  | 'draft'      // Черновик
  | 'published'  // Опубликован
  | 'in_progress' // В работе
  | 'completed'  // Завершен
  | 'cancelled'; // Отменен
```

### Переходы состояний

- `draft` → `published` (только владелец)
- `published` → `in_progress` (при принятии исполнителем)
- `in_progress` → `completed` (при сдаче работы)
- `in_progress` → `cancelled` (при отмене)
- `published` → `cancelled` (при отмене до принятия)

## Валидация данных

### Создание Gig

```typescript
const createGigSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(2000),
  budgetMin: z.number().min(1000).max(1000000),
  budgetMax: z.number().min(1000).max(1000000),
  timeline: z.number().min(1).max(365), // дни
  requiredSkills: z.array(z.string()).min(1).max(10),
  deliverables: z.array(z.string()).min(1).max(20)
}).refine(data => data.budgetMin <= data.budgetMax, {
  message: "Минимальный бюджет не может быть больше максимального"
});
```

### Обновление Gig

```typescript
const updateGigSchema = z.object({
  id: gigIdSchema,
  title: z.string().min(10).max(100).optional(),
  description: z.string().min(50).max(2000).optional(),
  budgetMin: z.number().min(1000).max(1000000).optional(),
  budgetMax: z.number().min(1000).max(1000000).optional(),
  timeline: z.number().min(1).max(365).optional(),
  requiredSkills: z.array(z.string()).min(1).max(10).optional(),
  deliverables: z.array(z.string()).min(1).max(20).optional()
}).refine(data => {
  if (data.budgetMin && data.budgetMax) {
    return data.budgetMin <= data.budgetMax;
  }
  return true;
});
```

## Правила бизнес-логики

### Публикация Gig

```typescript
// Проверки перед публикацией
const canPublishGig = async (gig: Gig, userId: string) => {
  // Только владелец может публиковать
  if (gig.ownerId !== userId) return false;

  // Должен быть в статусе draft
  if (gig.status !== 'draft') return false;

  // Все обязательные поля заполнены
  return !!(
    gig.title &&
    gig.description &&
    gig.budgetMin &&
    gig.budgetMax &&
    gig.timeline &&
    gig.requiredSkills?.length &&
    gig.deliverables?.length
  );
};
```

### Принятие Gig исполнителем

```typescript
const canAcceptGig = async (gig: Gig, userId: string) => {
  // Gig должен быть опубликован
  if (gig.status !== 'published') return false;

  // Нельзя принять свой собственный gig
  if (gig.ownerId === userId) return false;

  // Пользователь должен иметь необходимые навыки
  const hasRequiredSkills = await checkUserSkills(userId, gig.requiredSkills);

  return hasRequiredSkills;
};
```

## Управление файлами

### Загрузка файлов

```typescript
const fileUploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['deliverable', 'attachment', 'preview'])
}).refine(data => {
  // Проверка размера файла
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (data.file.size > maxSize) return false;

  // Проверка типа файла
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  return allowedTypes.includes(data.file.type);
});
```

## Уведомления

### Автоматические уведомления

```typescript
// При изменении статуса
const notifyStatusChange = async (gigId: string, oldStatus: GigStatus, newStatus: GigStatus) => {
  const gig = await db.gig.findUnique({ where: { id: gigId } });

  if (newStatus === 'published') {
    // Уведомить всех подписчиков workspace
    await notifyWorkspaceMembers(gig.workspaceId, `Новый gig: ${gig.title}`);
  }

  if (newStatus === 'in_progress') {
    // Уведомить владельца и исполнителя
    await notifyUsers([gig.ownerId, gig.assignedTo], `Gig "${gig.title}" принят в работу`);
  }
};
```

## Производительность

### Оптимизация запросов

```typescript
// Использовать include для связанных данных
const gigWithRelations = await db.gig.findUnique({
  where: { id: gigId },
  include: {
    owner: { select: { id: true, name: true, avatar: true } },
    assignedTo: { select: { id: true, name: true, avatar: true } },
    workspace: { select: { id: true, name: true } },
    deliverables: true,
    attachments: true
  }
});
```

### Кэширование

```typescript
// Кэшировать популярные gig-и
const cachedGig = await redis.get(`gig:${gigId}`);
if (cachedGig) {
  return JSON.parse(cachedGig);
}

// После получения обновить кэш
await redis.setex(`gig:${gigId}`, 300, JSON.stringify(gig)); // 5 минут
```
