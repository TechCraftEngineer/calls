# Design Document: Employee KPI Daily View

## Overview

Функция "Employee KPI Daily View" расширяет существующий раздел KPI сотрудников, добавляя возможность просмотра детализированной статистики с разбивкой по дням. Это позволяет администраторам workspace анализировать ежедневную эффективность сотрудников, отслеживать динамику выполнения KPI и принимать более обоснованные управленческие решения.

### Цели

- Предоставить детальную аналитику KPI сотрудников с разбивкой по дням
- Обеспечить визуализацию трендов и динамики показателей
- Упростить экспорт данных для дальнейшего анализа
- Интегрироваться с существующим разделом KPI без нарушения текущей функциональности

### Ключевые возможности

- Просмотр ежедневной статистики звонков (входящие, исходящие, пропущенные)
- Отображение времени разговоров и процента выполнения дневных целей
- Расчет ежедневных бонусов на основе выполнения KPI
- Визуализация данных в виде таблиц и графиков
- Гибкая фильтрация по датам с быстрыми пресетами
- Экспорт данных в CSV формат
- Адаптивный дизайн для всех устройств

## Architecture

### Общая архитектура

Функция реализуется как расширение существующего раздела статистики (`apps/app/src/app/statistics`) и использует архитектуру Next.js App Router с Server Components и Client Components.

```
┌─────────────────────────────────────────────────────────────┐
│                    Statistics Page                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐             │
│  │ Сводная  │  │   KPI    │  │  Настройки   │             │
│  │статистика│  │          │  │   отчетов    │             │
│  └──────────┘  └────┬─────┘  └──────────────┘             │
│                     │                                        │
│              ┌──────▼──────┐                                │
│              │  KPI Table  │                                │
│              │             │                                │
│              │ ┌─────────┐ │                                │
│              │ │ Просмотр│ │ ◄── NEW                       │
│              │ │ по дням │ │                                │
│              │ └────┬────┘ │                                │
│              └─────────────┘                                │
│                     │                                        │
│              ┌──────▼──────────────────────┐                │
│              │  Daily View Component       │                │
│              │  ┌────────────────────────┐ │                │
│              │  │ Employee List          │ │                │
│              │  │ (Server Component)     │ │                │
│              │  └───────────┬────────────┘ │                │
│              │              │               │                │
│              │  ┌───────────▼────────────┐ │                │
│              │  │ Daily Stats Table      │ │                │
│              │  │ (Client Component)     │ │                │
│              │  │  - Filters             │ │                │
│              │  │  - Sorting             │ │                │
│              │  │  - Pagination          │ │                │
│              │  └────────────────────────┘ │                │
│              │  ┌────────────────────────┐ │                │
│              │  │ Trend Chart            │ │                │
│              │  │ (Client Component)     │ │                │
│              │  └────────────────────────┘ │                │
│              └─────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ ORPC
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (packages/api)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  statistics.getKpiDaily                              │  │
│  │  Input: { employeeId, startDate, endDate }           │  │
│  │  Output: DailyKpiRow[]                               │  │
│  └────────────────────────┬─────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Database Layer (packages/db)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  callsService.getDailyKpiStats                       │  │
│  │  - Агрегация звонков по дням                         │  │
│  │  - Расчет времени разговоров                         │  │
│  │  - Группировка по internal_number                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Слои приложения

1. **Presentation Layer** (React Components)
   - `DailyViewPage` - Server Component для начальной загрузки
   - `DailyViewClient` - Client Component для интерактивности
   - `DailyStatsTable` - таблица с данными по дням
   - `TrendChart` - график динамики показателей
   - `DateRangeFilter` - фильтр периода
   - `ExportButton` - экспорт в CSV

2. **API Layer** (ORPC Procedures)
   - `statistics.getKpiDaily` - получение данных по дням для сотрудника
   - Использует существующую авторизацию `workspaceAdminProcedure`
   - Валидация входных параметров с помощью Zod

3. **Data Layer** (Database Service)
   - `callsService.getDailyKpiStats` - SQL запрос с агрегацией по дням
   - Использует существующие таблицы `calls` и `workspace_pbx_employees`

### Routing

Новый маршрут будет добавлен в существующую структуру:

```
/statistics/kpi/daily/[employeeId]?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Параметры URL:
- `employeeId` - external ID сотрудника (path parameter)
- `startDate` - начальная дата периода (query parameter)
- `endDate` - конечная дата периода (query parameter)

## Components and Interfaces

### React Components

#### 1. DailyViewPage (Server Component)

```typescript
// apps/app/src/app/statistics/kpi/daily/[employeeId]/page.tsx

interface PageProps {
  params: { employeeId: string };
  searchParams: { startDate?: string; endDate?: string };
}

export default async function DailyViewPage({ params, searchParams }: PageProps) {
  // Server-side data fetching
  // Передача данных в Client Component
}
```

#### 2. DailyViewClient (Client Component)

```typescript
// apps/app/src/components/features/kpi/daily-view-client.tsx

'use client';

interface DailyViewClientProps {
  employeeId: string;
  initialStartDate: string;
  initialEndDate: string;
}

export function DailyViewClient({ employeeId, initialStartDate, initialEndDate }: DailyViewClientProps) {
  // State management
  // Data fetching with ORPC
  // Render DailyStatsTable and TrendChart
}
```

#### 3. DailyStatsTable (Client Component)

```typescript
// apps/app/src/components/features/kpi/daily-stats-table.tsx

'use client';

interface DailyStatsTableProps {
  data: DailyKpiRow[];
  loading: boolean;
  employeeName: string;
}

export function DailyStatsTable({ data, loading, employeeName }: DailyStatsTableProps) {
  // TanStack Table для сортировки и пагинации
  // Цветовое кодирование по выполнению KPI
  // Экспорт в CSV
}
```

#### 4. TrendChart (Client Component)

```typescript
// apps/app/src/components/features/kpi/trend-chart.tsx

'use client';

interface TrendChartProps {
  data: DailyKpiRow[];
  targetTalkTimeMinutes: number;
}

export function TrendChart({ data, targetTalkTimeMinutes }: TrendChartProps) {
  // Recharts для визуализации
  // Линия фактических значений
  // Линия целевых значений
  // Цветовое кодирование точек
}
```

#### 5. DateRangeFilter (Client Component)

```typescript
// apps/app/src/components/features/kpi/date-range-filter.tsx

'use client';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  // shadcn/ui Calendar компонент
  // Быстрые фильтры (Сегодня, Вчера, и т.д.)
  // Валидация периода (макс 90 дней)
}
```

### API Interfaces

#### ORPC Procedure

```typescript
// packages/api/src/routers/statistics/get-kpi-daily.ts

export const getKpiDaily = workspaceAdminProcedure
  .input(
    z.object({
      employeeExternalId: z.string().min(1),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).refine(
      (data) => data.startDate <= data.endDate,
      { message: "startDate должна быть <= endDate" }
    ).refine(
      (data) => {
        const days = calculateDaysInPeriod(data.startDate, data.endDate);
        return days <= 90;
      },
      { message: "Период не может превышать 90 дней" }
    )
  )
  .handler(async ({ input, context }) => {
    // Implementation
  });
```

#### Database Service

```typescript
// packages/db/src/services/calls-service.ts

export interface GetDailyKpiStatsInput {
  workspaceId: string;
  employeeExternalId: string;
  dateFrom: string; // 'YYYY-MM-DD HH:MM:SS'
  dateTo: string;   // 'YYYY-MM-DD HH:MM:SS'
  excludePhoneNumbers?: string[];
}

export interface DailyKpiStat {
  date: string; // 'YYYY-MM-DD'
  totalDurationSeconds: number;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
}

export async function getDailyKpiStats(
  input: GetDailyKpiStatsInput
): Promise<DailyKpiStat[]> {
  // SQL query with GROUP BY DATE(call_time)
}
```

## Data Models

### DailyKpiRow

Основная модель данных для отображения KPI по дням:

```typescript
export interface DailyKpiRow {
  // Идентификация
  date: string; // 'YYYY-MM-DD'
  employeeExternalId: string;
  employeeName: string;
  employeeEmail: string;
  
  // Статистика звонков
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
  
  // Время разговоров
  actualTalkTimeMinutes: number;
  targetTalkTimeMinutes: number; // Дневная цель (месячная / дни в месяце)
  completionPercentage: number;  // (actual / target) * 100
  
  // Финансовые показатели
  dailyBonus: number;            // Рассчитанный бонус за день
  
  // Метаданные
  isWorkday: boolean;            // Рабочий день или выходной
}
```

### EmployeeKpiSettings

Настройки KPI сотрудника (используются из существующей модели):

```typescript
export interface EmployeeKpiSettings {
  employeeExternalId: string;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number; // Месячная цель
}
```

### DateRange

Модель для работы с периодами:

```typescript
export interface DateRange {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export type QuickFilter = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'currentMonth';
```

### CSV Export Format

Структура CSV файла для экспорта:

```
Дата;Сотрудник;Email;Входящие;Исходящие;Пропущенные;Всего звонков;Время разговоров (мин);Цель (мин);Выполнение (%);Бонус (₽)
2024-01-15;Иван Иванов;ivan@example.com;25;18;3;46;180;200;90;4500
2024-01-16;Иван Иванов;ivan@example.com;30;20;2;52;220;200;110;5000
```

## Correctness Properties

*Свойство (property) — это характеристика или поведение, которое должно выполняться для всех валидных входных данных системы. Свойства служат мостом между человекочитаемыми спецификациями и машинно-проверяемыми гарантиями корректности.*

### Property 1: Пропорциональное распределение месячных целей

*Для любой* месячной цели по времени разговоров и любого дня месяца, дневная цель должна рассчитываться как `месячная_цель / количество_дней_в_месяце`, где количество дней определяется для конкретного месяца и года.

**Validates: Requirements 3.2, 4.4**

### Property 2: Расчет процента выполнения

*Для любых* фактического времени разговоров и целевого времени (где целевое > 0), процент выполнения должен рассчитываться как `min(100, round((фактическое / целевое) * 100))`.

**Validates: Requirements 3.3**

### Property 3: Корректность агрегации

*Для любого* набора ежедневных значений (время разговоров, бонусы), накопительный итог за период должен равняться сумме всех дневных значений.

**Validates: Requirements 3.6, 4.3**

### Property 4: Цветовое кодирование по условиям выполнения

*Для любого* дня с процентом выполнения KPI:
- Если процент >= 100, применяется зеленый цвет
- Если процент >= 80 и < 100, применяется желтый цвет  
- Если процент < 80, применяется красный цвет

**Validates: Requirements 3.4, 3.5, 10.3**

### Property 5: Сериализация периода в URL

*Для любых* валидных дат начала и окончания периода, сериализация в URL параметры и последующая десериализация должна восстанавливать исходные значения дат.

**Validates: Requirements 5.3**

### Property 6: Генерация CSV с корректной структурой

*Для любого* набора ежедневных данных KPI, сгенерированный CSV файл должен:
- Содержать заголовок с 11 колонками в указанном порядке
- Содержать строку для каждого дня в данных
- Использовать точку с запятой как разделитель
- Использовать UTF-8 с BOM кодировку

**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 7: Форматирование данных

*Для любого* числового значения:
- Денежные значения форматируются с разделителем тысяч и символом ₽
- Имена CSV файлов соответствуют формату `kpi-daily-{employeeName}-{startDate}-{endDate}.csv`
- Даты форматируются в формате YYYY-MM-DD

**Validates: Requirements 4.5, 6.6**

## Error Handling

### Client-Side Errors

1. **Ошибки валидации периода**
   - Период > 90 дней: показать предупреждение с предложением сократить период
   - Некорректный формат даты: показать ошибку и сбросить на текущий месяц
   - startDate > endDate: автоматически поменять местами

2. **Ошибки загрузки данных**
   - Network error: показать toast с кнопкой "Повторить"
   - 403 Forbidden: редирект на страницу настроек
   - 404 Not Found: показать сообщение "Сотрудник не найден"
   - 500 Server Error: показать общее сообщение об ошибке

3. **Ошибки экспорта CSV**
   - Пустые данные: показать toast "Нет данных для экспорта"
   - Ошибка генерации: показать toast с описанием ошибки

### Server-Side Errors

1. **Ошибки авторизации**
   - Не авторизован: вернуть 401
   - Не администратор workspace: вернуть 403

2. **Ошибки валидации**
   - Невалидный employeeId: вернуть 400 с описанием
   - Невалидный период: вернуть 400 с описанием
   - Период > 90 дней: вернуть 400

3. **Ошибки базы данных**
   - Connection error: вернуть 500, залогировать
   - Query timeout: вернуть 504, залогировать
   - Сотрудник не найден: вернуть 404

### Error Recovery Strategies

- **Автоматический retry**: для network errors (макс 3 попытки с exponential backoff)
- **Fallback на кэш**: использовать кэшированные данные если доступны
- **Graceful degradation**: показывать частичные данные если часть запроса failed
- **User feedback**: всегда информировать пользователя о проблеме и возможных действиях

## Testing Strategy

### Unit Tests

Фокус на конкретных примерах, edge cases и error conditions:

1. **Component Tests**
   - Рендеринг компонентов с mock данными
   - Обработка пустых данных
   - Обработка loading состояния
   - Обработка error состояния
   - Keyboard navigation
   - Accessibility (aria-labels, roles)

2. **Utility Functions Tests**
   - Форматирование дат, чисел, валюты
   - Расчет дней в периоде
   - Генерация имен файлов
   - Парсинг URL параметров

3. **Integration Tests**
   - Навигация между общим видом KPI и daily view
   - Передача состояния через URL
   - Кэширование данных
   - Авторизация и права доступа

### Property-Based Tests

Проверка универсальных свойств на большом количестве сгенерированных входных данных (минимум 100 итераций):

1. **Property 1: Пропорциональное распределение**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 1
   fc.assert(
     fc.property(
       fc.integer({ min: 0, max: 100000 }), // monthlyTarget
       fc.integer({ min: 1, max: 31 }),     // dayOfMonth
       fc.integer({ min: 2020, max: 2030 }), // year
       fc.integer({ min: 1, max: 12 }),     // month
       (monthlyTarget, dayOfMonth, year, month) => {
         const daysInMonth = getDaysInMonth(year, month);
         const dailyTarget = calculateDailyTarget(monthlyTarget, year, month);
         const expected = Math.round(monthlyTarget / daysInMonth);
         return dailyTarget === expected;
       }
     ),
     { numRuns: 100 }
   );
   ```

2. **Property 2: Расчет процента выполнения**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 2
   fc.assert(
     fc.property(
       fc.integer({ min: 0, max: 10000 }), // actual
       fc.integer({ min: 1, max: 10000 }), // target
       (actual, target) => {
         const percentage = calculateCompletionPercentage(actual, target);
         const expected = Math.min(100, Math.round((actual / target) * 100));
         return percentage === expected && percentage >= 0 && percentage <= 100;
       }
     ),
     { numRuns: 100 }
   );
   ```

3. **Property 3: Корректность агрегации**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 3
   fc.assert(
     fc.property(
       fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 90 }),
       (dailyValues) => {
         const total = calculateTotal(dailyValues);
         const expected = dailyValues.reduce((sum, val) => sum + val, 0);
         return total === expected;
       }
     ),
     { numRuns: 100 }
   );
   ```

4. **Property 4: Цветовое кодирование**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 4
   fc.assert(
     fc.property(
       fc.integer({ min: 0, max: 200 }), // percentage
       (percentage) => {
         const color = getColorByPercentage(percentage);
         if (percentage >= 100) return color === 'green';
         if (percentage >= 80) return color === 'yellow';
         return color === 'red';
       }
     ),
     { numRuns: 100 }
   );
   ```

5. **Property 5: Сериализация периода в URL**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 5
   fc.assert(
     fc.property(
       fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
       fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
       (date1, date2) => {
         const [startDate, endDate] = date1 <= date2 ? [date1, date2] : [date2, date1];
         const serialized = serializeDateRange(startDate, endDate);
         const deserialized = deserializeDateRange(serialized);
         return (
           formatDate(deserialized.startDate) === formatDate(startDate) &&
           formatDate(deserialized.endDate) === formatDate(endDate)
         );
       }
     ),
     { numRuns: 100 }
   );
   ```

6. **Property 6: Генерация CSV**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 6
   fc.assert(
     fc.property(
       fc.array(
         fc.record({
           date: fc.date(),
           totalCalls: fc.integer({ min: 0, max: 1000 }),
           actualTalkTimeMinutes: fc.integer({ min: 0, max: 1000 }),
           // ... other fields
         }),
         { minLength: 1, maxLength: 90 }
       ),
       (dailyData) => {
         const csv = generateCSV(dailyData);
         const lines = csv.split('\n');
         const header = lines[0];
         const dataLines = lines.slice(1);
         
         return (
           header.split(';').length === 11 &&
           dataLines.length === dailyData.length &&
           csv.startsWith('\uFEFF') && // UTF-8 BOM
           lines.every(line => line.split(';').length === 11)
         );
       }
     ),
     { numRuns: 100 }
   );
   ```

7. **Property 7: Форматирование данных**
   ```typescript
   // Feature: employee-kpi-daily-view, Property 7
   fc.assert(
     fc.property(
       fc.integer({ min: 0, max: 1000000 }),
       (value) => {
         const formatted = formatCurrency(value);
         return (
           formatted.endsWith(' ₽') &&
           formatted.includes(' ') && // разделитель тысяч
           !isNaN(parseFloat(formatted.replace(/[^\d]/g, '')))
         );
       }
     ),
     { numRuns: 100 }
   );
   ```

### Performance Tests

- Загрузка данных за месяц (30 дней): < 2 секунды
- Рендеринг таблицы с 90 днями: < 500ms
- Генерация CSV файла: < 1 секунда
- Переключение между сотрудниками (с кэшем): < 100ms

### Accessibility Tests

- Automated audit с axe-core
- Keyboard navigation тесты
- Screen reader compatibility
- Контрастность цветов (WCAG AA)

## Performance Considerations

### Caching Strategy

1. **Server-Side Caching**
   - React Cache для дедупликации запросов в Server Components
   - Кэширование результатов `getKpiDaily` на 5 минут
   - Инвалидация кэша при обновлении KPI настроек сотрудника

2. **Client-Side Caching**
   - TanStack Query для кэширования API responses
   - `staleTime: 5 * 60 * 1000` (5 минут)
   - `cacheTime: 10 * 60 * 1000` (10 минут)
   - Prefetching данных при hover на сотрудника

3. **URL State Caching**
   - Сохранение выбранного периода в URL
   - Восстановление состояния при возврате на страницу
   - Browser history для навигации назад/вперед

### Optimization Techniques

1. **Data Fetching**
   - Параллельные запросы для независимых данных
   - Incremental loading для больших периодов
   - Debounce для фильтров (300ms)

2. **Rendering**
   - Виртуализация списка при > 100 дней (react-window)
   - Мемоизация тяжелых вычислений (useMemo)
   - Lazy loading для графиков (React.lazy)
   - Code splitting по роутам

3. **Bundle Size**
   - Tree-shaking неиспользуемого кода
   - Dynamic imports для Recharts
   - Оптимизация shadcn/ui imports

### Database Query Optimization

```sql
-- Оптимизированный запрос с индексами
SELECT 
  DATE(call_time) as date,
  SUM(duration_seconds) as total_duration_seconds,
  COUNT(*) as total_calls,
  SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as incoming,
  SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outgoing,
  SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
FROM calls
WHERE 
  workspace_id = $1
  AND internal_number IN (SELECT unnest($2::text[]))
  AND call_time >= $3
  AND call_time <= $4
  AND ($5::text[] IS NULL OR phone_number NOT IN (SELECT unnest($5::text[])))
GROUP BY DATE(call_time)
ORDER BY date ASC;

-- Необходимые индексы:
-- CREATE INDEX idx_calls_workspace_time ON calls(workspace_id, call_time);
-- CREATE INDEX idx_calls_internal_number ON calls(internal_number);
```

### Monitoring

- Логирование медленных запросов (> 2 секунды)
- Метрики времени рендеринга компонентов
- Tracking размера кэша
- Мониторинг memory leaks

---

**Дата создания:** 2024-01-15  
**Версия:** 1.0  
**Статус:** Draft