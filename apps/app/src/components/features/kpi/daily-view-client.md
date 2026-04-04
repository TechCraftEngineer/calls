# DailyViewClient Component

## Описание

`DailyViewClient` — это Client Component для отображения детализированной статистики KPI сотрудника с разбивкой по дням. Компонент интегрирует все необходимые подкомпоненты и обеспечивает полный цикл работы с данными: загрузку, фильтрацию, визуализацию и экспорт.

## Основные возможности

- ✅ Загрузка данных через ORPC с автоматическим кэшированием
- ✅ Синхронизация состояния с URL параметрами
- ✅ Фильтрация по периоду с помощью DateRangeFilter
- ✅ Два режима отображения: таблица и график
- ✅ Обработка ошибок с возможностью retry
- ✅ Навигация назад к общему виду KPI
- ✅ Полная поддержка accessibility

## Props

```typescript
interface DailyViewClientProps {
  employeeId: string;        // External ID сотрудника
  initialStartDate: string;  // Начальная дата в формате YYYY-MM-DD
  initialEndDate: string;    // Конечная дата в формате YYYY-MM-DD
}
```

## Использование

### Базовый пример

```tsx
import { DailyViewClient } from "@/components/features/kpi";

export default function Page() {
  return (
    <DailyViewClient
      employeeId="employee-123"
      initialStartDate="2024-01-01"
      initialEndDate="2024-01-31"
    />
  );
}
```

### Интеграция в Server Component

```tsx
// app/statistics/kpi/daily/[employeeId]/page.tsx

import { DailyViewClient } from "@/components/features/kpi";

interface PageProps {
  params: { employeeId: string };
  searchParams: { startDate?: string; endDate?: string };
}

export default function DailyViewPage({ params, searchParams }: PageProps) {
  // Получаем текущий месяц по умолчанию
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  
  const startDate = searchParams.startDate || formatDate(firstDay);
  const endDate = searchParams.endDate || formatDate(lastDay);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">KPI по дням</h1>
      <DailyViewClient
        employeeId={params.employeeId}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}
```

## Архитектура

### Интегрированные компоненты

1. **DateRangeFilter** - фильтр периода с быстрыми пресетами
2. **DailyStatsTable** - таблица с данными, сортировкой и пагинацией
3. **TrendChart** - график динамики показателей
4. **ExportButton** - экспорт данных в CSV (интегрирован в DailyStatsTable)

### Data Flow

```
DailyViewClient
    ↓
  useQuery (ORPC)
    ↓
statistics.getKpiDaily
    ↓
  DailyKpiRow[]
    ↓
DailyStatsTable / TrendChart
```

### State Management

Компонент управляет следующим состоянием:

1. **startDate / endDate** - период для отображения данных
   - Синхронизируется с URL query параметрами
   - Обновляется через DateRangeFilter

2. **viewMode** - режим отображения ("table" | "chart")
   - Локальное состояние компонента
   - Переключается кнопками в UI

3. **data / isLoading / error** - состояние загрузки данных
   - Управляется TanStack Query
   - Автоматический retry при ошибках

## URL Синхронизация

Компонент автоматически синхронизирует период с URL:

```
/statistics/kpi/daily/employee-123?startDate=2024-01-01&endDate=2024-01-31
```

При изменении периода через DateRangeFilter:
- URL обновляется без перезагрузки страницы
- Scroll позиция сохраняется
- Данные автоматически перезагружаются

## Кэширование

Компонент использует TanStack Query для кэширования:

```typescript
{
  staleTime: 5 * 60 * 1000,  // 5 минут - данные считаются свежими
  gcTime: 10 * 60 * 1000,    // 10 минут - данные хранятся в кэше
  retry: 3,                   // 3 попытки при ошибке
}
```

## Error Handling

При ошибке загрузки данных:
1. Отображается сообщение об ошибке
2. Показывается текст ошибки (если доступен)
3. Предоставляется кнопка "Повторить попытку"
4. При клике на кнопку вызывается `refetch()`

## Accessibility

Компонент полностью доступен:

- ✅ Все кнопки имеют `aria-label`
- ✅ Переключатели режимов имеют `aria-pressed`
- ✅ Keyboard navigation поддерживается
- ✅ Screen reader friendly
- ✅ Контрастность соответствует WCAG AA

## Performance

### Оптимизации

1. **Мемоизация колбэков** - использование `useCallback` для предотвращения лишних ре-рендеров
2. **Кэширование данных** - TanStack Query кэширует результаты на 5 минут
3. **Lazy loading** - TrendChart использует code splitting (если настроен)
4. **Виртуализация** - DailyStatsTable виртуализирует список при >= 90 днях

### Метрики

- Загрузка данных за месяц: < 2 секунды
- Переключение между режимами: мгновенно (локальное состояние)
- Изменение периода: < 100ms (если данные в кэше)

## Связанные компоненты

- [DateRangeFilter](./date-range-filter.md) - фильтр периода
- [DailyStatsTable](./daily-stats-table.md) - таблица данных
- [TrendChart](./trend-chart.md) - график динамики
- [ExportButton](./export-button.tsx) - экспорт в CSV

## Requirements

Компонент реализует следующие требования из спецификации:

- **5.1, 5.2, 5.3** - Фильтрация и навигация по датам
- **8.1, 8.3, 8.4, 8.5** - Производительность и загрузка данных
- **9.3** - Интеграция с существующим разделом KPI
- **10.5** - Визуализация трендов

## Примечания

1. Компонент требует обертку в `ORPCReactProvider` для работы с ORPC
2. Для корректной работы необходим активный workspace (через cookie)
3. Пользователь должен иметь права администратора workspace
4. Максимальный период для выбора: 90 дней (валидация на уровне API)
