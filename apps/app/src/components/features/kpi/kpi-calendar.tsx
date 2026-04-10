"use client";

import type { DailyKpiRow } from "@calls/shared";
import { pluralize } from "@calls/shared";
import { Button, Card, cn, Skeleton } from "@calls/ui";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";
import * as React from "react";

interface KpiCalendarProps {
  data: DailyKpiRow[];
  loading: boolean;
  startDate: string;
  onDateClick?: (date: string) => void;
  selectedDate?: string | null;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Утилита для парсинга даты из строки YYYY-MM-DD
function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day);
}

// Получить цвет по проценту выполнения
function getCompletionColor(percentage: number): string {
  if (percentage >= 100) return "bg-emerald-500";
  if (percentage >= 80) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

// Получить цвет фона по проценту выполнения
function getCompletionBgColor(percentage: number): string {
  if (percentage >= 100) return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
  if (percentage >= 80) return "bg-blue-50 hover:bg-blue-100 border-blue-200";
  if (percentage >= 50) return "bg-amber-50 hover:bg-amber-100 border-amber-200";
  return "bg-rose-50 hover:bg-rose-100 border-rose-200";
}

// Получить текстовый цвет по проценту выполнения
function getCompletionTextColor(percentage: number): string {
  if (percentage >= 100) return "text-emerald-700";
  if (percentage >= 80) return "text-blue-700";
  if (percentage >= 50) return "text-amber-700";
  return "text-rose-700";
}

// Мемоизированный компонент содержимого ячейки дня
interface DayCellContentProps {
  day: {
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
  };
  kpiData?: DailyKpiRow;
  hasData: boolean;
  completionPercentage: number;
}

const DayCellContent = React.memo(function DayCellContent({
  day,
  kpiData,
  hasData,
  completionPercentage,
}: DayCellContentProps) {
  return (
    <>
      {/* Номер дня */}
      <span
        className={cn(
          "text-sm font-semibold",
          day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/60",
          day.isToday && "text-primary",
        )}
      >
        {day.date.getDate()}
      </span>

      {/* Индикаторы KPI */}
      {hasData && kpiData && (
        <div className="flex-1 flex flex-col justify-end gap-1 min-w-0">
          {/* Индикатор выполнения */}
          <div className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", getCompletionColor(completionPercentage))} />
            <span
              className={cn(
                "text-xs font-bold truncate",
                getCompletionTextColor(completionPercentage),
              )}
            >
              {completionPercentage}%
            </span>
          </div>

          {/* Количество звонков */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
            <span className="truncate">
              {kpiData.totalCalls} {pluralize(kpiData.totalCalls, "звонок", "звонка", "звонков")}
            </span>
          </div>

          {/* Время разговоров */}
          <div className="text-xs text-muted-foreground truncate">
            {kpiData.actualTalkTimeMinutes} мин
          </div>
        </div>
      )}

      {/* Индикатор дня с данными (точка) */}
      {hasData && (
        <div
          className={cn(
            "absolute top-2 right-2 w-2 h-2 rounded-full",
            getCompletionColor(completionPercentage),
          )}
        />
      )}
    </>
  );
});

// Создать карту данных по датам
function createDataMap(data: DailyKpiRow[]): Map<string, DailyKpiRow> {
  const map = new Map<string, DailyKpiRow>();
  for (const row of data) {
    map.set(row.date, row);
  }
  return map;
}

// Получить массив дней для календарной сетки
function getCalendarDays(
  year: number,
  month: number,
): Array<{
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}> {
  const days: Array<{
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Первый день месяца
  const firstDay = new Date(year, month, 1);
  // Последний день месяца
  const lastDay = new Date(year, month + 1, 0);

  // День недели первого дня (0 = Вс, 1 = Пн, ...)
  let firstWeekday = firstDay.getDay();
  // Преобразуем к формату 0 = Пн, 6 = Вс
  firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;

  // Добавляем дни из предыдущего месяца
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Добавляем дни текущего месяца
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({
      date,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Добавляем дни следующего месяца чтобы заполнить сетку
  const remainingCells = 42 - days.length; // 6 строк по 7 дней
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

// Скелетон для загрузки
function CalendarSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-8 w-full" />
        ))}
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={`day-${i}`} className="h-20 w-full" />
        ))}
      </div>
    </Card>
  );
}

// Пустое состояние
const EmptyState = React.memo(function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="text-muted-foreground text-lg font-medium">Нет данных для отображения</div>
        <div className="text-muted-foreground text-sm">Попробуйте выбрать другой период</div>
      </div>
    </Card>
  );
});

// Месяцы для отображения
const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export const KpiCalendar = React.memo(function KpiCalendar({
  data,
  loading,
  startDate,
  onDateClick,
  selectedDate,
}: KpiCalendarProps) {
  // Определяем начальный месяц из startDate
  const initialDate = React.useMemo(() => {
    const date = parseDate(startDate);
    return date || new Date();
  }, [startDate]);

  const [currentYear, setCurrentYear] = React.useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(initialDate.getMonth());

  // Синхронизируем с внешними датами
  React.useEffect(() => {
    const date = parseDate(startDate);
    if (date) {
      setCurrentYear(date.getFullYear());
      setCurrentMonth(date.getMonth());
    }
  }, [startDate]);

  // Карта данных по датам
  const dataMap = React.useMemo(() => createDataMap(data), [data]);

  // Дни для отображения
  const days = React.useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // Навигация
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  if (loading) {
    return <CalendarSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card className="p-4 sm:p-6">
      {/* Заголовок с навигацией */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-muted-foreground">
            Сегодня
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            aria-label="Предыдущий месяц"
            className="h-11 w-11"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            aria-label="Следующий месяц"
            className="h-11 w-11"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Заголовки дней недели */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Сетка дней */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const kpiData = dataMap.get(day.dateStr);
          const hasData = !!kpiData && kpiData.totalCalls > 0;
          const completionPercentage = kpiData?.completionPercentage || 0;
          const isSelected = selectedDate === day.dateStr;

          const isInteractive = !!onDateClick;
          const dayCellClassName = cn(
            "relative aspect-square p-2 rounded-lg border transition-all duration-200 text-left flex flex-col gap-1 min-h-[80px] sm:min-h-[100px]",
            day.isCurrentMonth
              ? "bg-card border-border"
              : "bg-muted/30 border-transparent text-muted-foreground",
            day.isToday && "ring-2 ring-primary ring-offset-1",
            hasData && day.isCurrentMonth && getCompletionBgColor(completionPercentage),
            isSelected && "ring-2 ring-offset-2 ring-indigo-500",
            isInteractive && [
              "hover:shadow-md hover:z-10",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            ],
          );

          return isInteractive ? (
            <button
              key={day.dateStr}
              onClick={() => onDateClick(day.dateStr)}
              className={dayCellClassName}
            >
              <DayCellContent
                day={day}
                kpiData={kpiData}
                hasData={hasData}
                completionPercentage={completionPercentage}
              />

              {/* Выходные дни */}
              {(index % 7 === 5 || index % 7 === 6) && day.isCurrentMonth && !hasData && (
                <div className="absolute inset-0 bg-amber-50/30 dark:bg-amber-950/10 rounded-lg pointer-events-none" />
              )}
            </button>
          ) : (
            <div key={day.dateStr} className={dayCellClassName}>
              <DayCellContent
                day={day}
                kpiData={kpiData}
                hasData={hasData}
                completionPercentage={completionPercentage}
              />

              {/* Выходные дни */}
              {(index % 7 === 5 || index % 7 === 6) && day.isCurrentMonth && !hasData && (
                <div className="absolute inset-0 bg-amber-50/30 dark:bg-amber-950/10 rounded-lg pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Легенда */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">≥100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">80-99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">50-79%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">&lt;50%</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-3 h-3 rounded-full border-2 border-primary" />
          <span className="text-muted-foreground">Сегодня</span>
        </div>
      </div>
    </Card>
  );
});
