"use client";

import { Button, Calendar, cn, Popover, PopoverContent, PopoverTrigger } from "@calls/ui";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { getQuickFilterDates, type QuickFilter } from "@/lib/date-range-utils";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

const QUICK_FILTERS: Array<{ value: QuickFilter; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "yesterday", label: "Вчера" },
  { value: "last7days", label: "Последние 7 дней" },
  { value: "last30days", label: "Последние 30 дней" },
  { value: "currentMonth", label: "Текущий месяц" },
];

const MAX_DAYS = 90;

// Утилита для парсинга даты из строки YYYY-MM-DD в локальную дату (без UTC сдвига)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function calculateDaysBetween(start: string, end: string): number {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Включаем оба дня
}

function formatDateForDisplay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const DateRangeFilter = React.memo(function DateRangeFilter({
  startDate,
  endDate,
  onChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [numberOfMonths, setNumberOfMonths] = React.useState(1);
  const [tempRange, setTempRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [warning, setWarning] = React.useState<string | null>(null);

  // Инициализация и обновление tempRange при изменении startDate/endDate
  React.useEffect(() => {
    setTempRange({
      from: startDate ? parseLocalDate(startDate) : undefined,
      to: endDate ? parseLocalDate(endDate) : undefined,
    });
  }, [startDate, endDate]);

  // Обновление numberOfMonths на клиенте (избегаем hydration mismatch)
  React.useEffect(() => {
    const updateMonths = () => {
      setNumberOfMonths(window.innerWidth >= 768 ? 2 : 1);
    };
    updateMonths();
    window.addEventListener("resize", updateMonths);
    return () => window.removeEventListener("resize", updateMonths);
  }, []);

  // Обработка Escape для закрытия
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleQuickFilter = (filter: QuickFilter) => {
    const dates = getQuickFilterDates(filter);
    onChange(dates.startDate, dates.endDate);
    setWarning(null);
    setOpen(false);
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setTempRange({ from: undefined, to: undefined });
      return;
    }

    setTempRange({ from: range.from, to: range.to });

    // Если выбраны обе даты, проверяем валидацию
    if (range.from && range.to) {
      const from = formatDateToISO(range.from);
      const to = formatDateToISO(range.to);
      const days = calculateDaysBetween(from, to);

      if (days > MAX_DAYS) {
        setWarning(`Период не может превышать ${MAX_DAYS} дней. Выбрано: ${days} дней.`);
      } else {
        setWarning(null);
        onChange(from, to);
        setOpen(false);
      }
    }
  };

  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const displayText = React.useMemo(() => {
    if (!startDate || !endDate) return "Выберите период";
    return `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal md:w-[300px] min-h-[44px]",
              !startDate && "text-muted-foreground",
            )}
            aria-label="Выбрать период дат"
            aria-expanded={open}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col gap-2 p-3">
            {/* Быстрые фильтры */}
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium text-muted-foreground px-2 py-1">
                Быстрый выбор
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFilter(filter.value)}
                    className="justify-start min-h-[44px]"
                    aria-label={`Выбрать период: ${filter.label}`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t" />

            {/* Календарь */}
            <div className="text-sm font-medium text-muted-foreground px-2 py-1">
              Выбрать период
            </div>
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={numberOfMonths}
              disabled={(date) => date > new Date()}
              aria-label="Календарь для выбора периода"
            />

            {/* Предупреждение */}
            {warning && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {warning}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
