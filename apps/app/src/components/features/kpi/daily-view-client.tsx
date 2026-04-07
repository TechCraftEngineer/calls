"use client";

import { Button, Card } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, CalendarDays, Table as TableIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useORPC } from "@/orpc/react";
import { KpiCalendar } from "./kpi-calendar";
import { DailyStatsTable } from "./daily-stats-table";
import { DateRangeFilter } from "./date-range-filter";
import { TrendChart } from "./trend-chart";

interface DailyViewClientProps {
  employeeId: string;
  initialStartDate: string;
  initialEndDate: string;
}

type ViewMode = "table" | "chart" | "calendar";

// Error state с retry
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-destructive text-lg font-semibold">Ошибка загрузки данных</div>
        <div className="text-muted-foreground text-sm max-w-md">
          {error.message || "Не удалось загрузить данные. Попробуйте еще раз."}
        </div>
        <Button onClick={onRetry} variant="outline">
          Повторить попытку
        </Button>
      </div>
    </Card>
  );
}

export function DailyViewClient({
  employeeId,
  initialStartDate,
  initialEndDate,
}: DailyViewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orpc = useORPC();

  // State для периода (синхронизируется с URL)
  const [startDate, setStartDate] = React.useState(
    searchParams.get("startDate") || initialStartDate,
  );
  const [endDate, setEndDate] = React.useState(searchParams.get("endDate") || initialEndDate);

  // State для режима отображения (таблица/график/календарь) - синхронизируется с URL
  const [viewMode, setViewMode] = React.useState<ViewMode>(
    (searchParams.get("view") as ViewMode) || "table",
  );

  // Синхронизация viewMode с URL при изменении
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentView = params.get("view") as ViewMode;
    if (currentView !== viewMode && ["table", "chart", "calendar"].includes(viewMode)) {
      params.set("view", viewMode);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [viewMode, router, searchParams]);

  // Загрузка данных с TanStack Query
  const { data, isLoading, error, refetch } = useQuery({
    ...orpc.statistics.getKpiDaily.queryOptions({
      input: {
        employeeExternalId: employeeId,
        startDate,
        endDate,
      },
    }),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут (в TanStack Query v5 переименовано из cacheTime)
    retry: 3,
  });

  // Синхронизация с URL при изменении периода
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentStartDate = params.get("startDate");
    const currentEndDate = params.get("endDate");

    // Пропускаем навигацию, если URL уже содержит нужные значения
    if (currentStartDate === startDate && currentEndDate === endDate) {
      return;
    }

    params.set("startDate", startDate);
    params.set("endDate", endDate);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [startDate, endDate, router, searchParams]);

  // Обработчик изменения периода
  const handleDateRangeChange = React.useCallback((newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  // Получаем имя сотрудника из данных
  const employeeName = data && data.length > 0 ? data[0].employeeName : "Сотрудник";

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой "Назад" */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/statistics/kpi"
            aria-label="Назад к общему виду"
            className="inline-flex items-center gap-2 min-h-[44px] text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Назад к общему виду</span>
            <span className="sm:hidden">Назад</span>
          </Link>
        </div>
      </div>

      {/* Фильтр периода */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <DateRangeFilter startDate={startDate} endDate={endDate} onChange={handleDateRangeChange} />

        {/* Переключатель таблица/график/календарь */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            aria-label="Показать таблицу"
            aria-pressed={viewMode === "table"}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <TableIcon className="mr-2 h-4 w-4" />
            Таблица
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            aria-label="Показать календарь"
            aria-pressed={viewMode === "calendar"}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Календарь
          </Button>
          <Button
            variant={viewMode === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("chart")}
            aria-label="Показать график"
            aria-pressed={viewMode === "chart"}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            График
          </Button>
        </div>
      </div>

      {/* Контент */}
      {error ? (
        <ErrorState error={error as Error} onRetry={refetch} />
      ) : viewMode === "table" ? (
        <DailyStatsTable
          data={data ?? []}
          loading={isLoading}
          employeeName={employeeName}
          startDate={startDate}
          endDate={endDate}
        />
      ) : viewMode === "calendar" ? (
        <KpiCalendar
          data={data ?? []}
          loading={isLoading}
          startDate={startDate}
          endDate={endDate}
        />
      ) : (
        <TrendChart data={data ?? []} loading={isLoading} />
      )}
    </div>
  );
}
