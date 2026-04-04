/**
 * Пример использования компонента DailyViewClient
 *
 * Этот компонент предназначен для отображения детализированной статистики KPI
 * сотрудника с разбивкой по дням. Он интегрирует все необходимые подкомпоненты:
 * - DateRangeFilter для выбора периода
 * - DailyStatsTable для табличного представления
 * - TrendChart для графического представления
 *
 * Компонент автоматически:
 * - Загружает данные через ORPC с кэшированием (5 минут)
 * - Синхронизирует состояние с URL параметрами
 * - Обрабатывает ошибки с возможностью retry
 * - Предоставляет переключение между таблицей и графиком
 */

import { DailyViewClient } from "./daily-view-client";

export function DailyViewClientExample() {
  return (
    <div className="container mx-auto py-8">
      <DailyViewClient
        employeeId="employee-123"
        initialStartDate="2024-01-01"
        initialEndDate="2024-01-31"
      />
    </div>
  );
}

/**
 * Пример использования в Server Component (page.tsx)
 *
 * ```tsx
 * // app/statistics/kpi/daily/[employeeId]/page.tsx
 *
 * import { DailyViewClient } from "@/components/features/kpi";
 *
 * interface PageProps {
 *   params: { employeeId: string };
 *   searchParams: { startDate?: string; endDate?: string };
 * }
 *
 * export default function DailyViewPage({ params, searchParams }: PageProps) {
 *   // Получаем текущий месяц по умолчанию
 *   const now = new Date();
 *   const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
 *   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
 *
 *   const formatDate = (date: Date) => {
 *     const year = date.getFullYear();
 *     const month = String(date.getMonth() + 1).padStart(2, "0");
 *     const day = String(date.getDate()).padStart(2, "0");
 *     return `${year}-${month}-${day}`;
 *   };
 *
 *   const startDate = searchParams.startDate || formatDate(firstDay);
 *   const endDate = searchParams.endDate || formatDate(lastDay);
 *
 *   return (
 *     <div className="container mx-auto py-8">
 *       <h1 className="text-3xl font-bold mb-6">KPI по дням</h1>
 *       <DailyViewClient
 *         employeeId={params.employeeId}
 *         initialStartDate={startDate}
 *         initialEndDate={endDate}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Props компонента:
 *
 * @param employeeId - External ID сотрудника (из URL параметра)
 * @param initialStartDate - Начальная дата периода в формате YYYY-MM-DD
 * @param initialEndDate - Конечная дата периода в формате YYYY-MM-DD
 *
 * Компонент автоматически:
 * - Синхронизирует startDate и endDate с URL query параметрами
 * - Загружает данные при изменении периода
 * - Кэширует данные на 5 минут (staleTime)
 * - Сохраняет данные в кэше на 10 минут (gcTime)
 * - Делает до 3 попыток при ошибке загрузки
 */

/**
 * Особенности реализации:
 *
 * 1. URL синхронизация:
 *    - Использует URLSearchParams для работы с query параметрами
 *    - Обновляет URL без перезагрузки страницы (router.replace)
 *    - Сохраняет scroll позицию при изменении URL
 *
 * 2. Data fetching:
 *    - Использует TanStack Query через ORPC
 *    - Автоматический retry при ошибках (3 попытки)
 *    - Кэширование для оптимизации производительности
 *
 * 3. UI состояния:
 *    - Loading: показывает skeleton через DailyStatsTable/TrendChart
 *    - Error: показывает сообщение с кнопкой retry
 *    - Success: отображает данные в выбранном режиме
 *
 * 4. Accessibility:
 *    - Все кнопки имеют aria-label
 *    - Переключатели имеют aria-pressed
 *    - Keyboard navigation поддерживается
 */
