# DailyStatsTable - Реализация

## Обзор

Компонент `DailyStatsTable` реализует таблицу с детализированной статистикой KPI сотрудников по дням. Использует TanStack Table v8 для управления сортировкой и пагинацией.

## Архитектура

### Основные компоненты

```
DailyStatsTable
├── TableSkeleton (loading state)
├── EmptyState (empty state)
└── Table (main content)
    ├── TableHeader (с кнопками сортировки)
    ├── TableBody (строки с цветовым кодированием)
    ├── TableFooter (накопительные итоги)
    └── Pagination (навигация по страницам)
```

### Состояния

1. **Loading** - Показывает skeleton загрузчики
2. **Empty** - Показывает сообщение "Нет данных"
3. **Normal** - Отображает таблицу с данными

## Ключевые функции

### 1. Цветовое кодирование строк

```typescript
const getRowColorClass = (percentage: number): string => {
  const color = getColorByPercentage(percentage);
  if (color === "green") return "bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30";
  if (color === "yellow") return "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30";
  return "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30";
};
```

Использует функцию `getColorByPercentage` из `@/lib/kpi-utils` для определения цвета на основе процента выполнения.

### 2. Накопительные итоги

```typescript
const totals = React.useMemo(() => {
  if (!data || data.length === 0) {
    return { /* нулевые значения */ };
  }

  const sums = data.reduce((acc, row) => ({
    totalCalls: acc.totalCalls + row.totalCalls,
    incoming: acc.incoming + row.incoming,
    // ... остальные поля
  }), { /* начальные значения */ });

  const completionPercentage =
    sums.targetTalkTimeMinutes > 0
      ? Math.min(100, Math.round((sums.actualTalkTimeMinutes / sums.targetTalkTimeMinutes) * 100))
      : 0;

  return { ...sums, completionPercentage };
}, [data]);
```

Вычисляет суммы всех метрик и общий процент выполнения.

### 3. Сортировка колонок

Каждая колонка имеет кнопку сортировки с визуальными индикаторами:

```typescript
{
  accessorKey: "date",
  header: ({ column }) => {
    const isSorted = column.getIsSorted();
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        aria-label={`Сортировать по дате ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
      >
        Дата
        {isSorted === "asc" ? <ArrowUp /> : isSorted === "desc" ? <ArrowDown /> : <ArrowUpDown />}
      </Button>
    );
  },
  // ...
}
```

### 4. Пагинация

Автоматически активируется при количестве записей > 30:

```typescript
const ITEMS_PER_PAGE = 30;

const table = useReactTable({
  data,
  columns,
  // ...
  getPaginationRowModel: getPaginationRowModel(),
  initialState: {
    pagination: {
      pageSize: ITEMS_PER_PAGE,
    },
  },
});
```

## Интеграция с другими компонентами

### ExportButton

Встроен в заголовок таблицы:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h3>{employeeName}</h3>
    <p>{startDate} - {endDate}</p>
  </div>
  <ExportButton
    data={data}
    employeeName={employeeName}
    startDate={startDate}
    endDate={endDate}
  />
</div>
```

### Утилиты

- `formatCurrency` - форматирование денежных значений
- `getColorByPercentage` - определение цвета по проценту

## Производительность

### Оптимизации

1. **useMemo для totals** - Пересчет только при изменении data
2. **useMemo для columns** - Определение колонок один раз
3. **TanStack Table** - Эффективное управление большими наборами данных
4. **Пагинация** - Рендеринг только 30 записей за раз

### Виртуализация

Готово к реализации для >= 90 дней:

```typescript
// TODO: Добавить react-window или @tanstack/react-virtual
const shouldVirtualize = data.length >= 90;
```

## Accessibility

### Реализованные возможности

1. **Aria-labels** - Все кнопки имеют описательные метки
2. **Semantic HTML** - Использование `<table>`, `<thead>`, `<tbody>`, `<tfoot>`
3. **Keyboard navigation** - Поддержка через TanStack Table
4. **Visual feedback** - Hover состояния для строк

### Примеры aria-labels

```tsx
aria-label="Сортировать по дате по возрастанию"
aria-label="Предыдущая страница"
aria-label="Следующая страница"
```

## Тестирование

### Unit тесты (TODO)

- Рендеринг таблицы с данными
- Empty state
- Loading state
- Сортировка
- Пагинация
- Цветовое кодирование
- Вычисление итогов

### Integration тесты (TODO)

- Интеграция с ExportButton
- Интеграция с TanStack Table
- Обработка больших наборов данных

## Будущие улучшения

1. **Виртуализация** - Для >= 90 дней использовать react-window
2. **Мобильная версия** - Карточки вместо таблицы на узких экранах
3. **Фильтрация** - Фильтры по колонкам
4. **Экспорт выбранных** - Возможность выбора строк для экспорта
5. **Графики в строках** - Мини-графики в ячейках

## Связанные файлы

- `daily-stats-table.tsx` - Основной компонент
- `daily-stats-table.example.tsx` - Примеры использования
- `export-button.tsx` - Кнопка экспорта
- `@/lib/kpi-utils.ts` - Утилиты для расчетов
- `@/lib/csv-export.ts` - Генерация CSV
