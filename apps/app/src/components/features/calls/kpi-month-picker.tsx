import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@calls/ui";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface KpiMonthPickerProps {
  selectedMonth: string;
  currentMonthValue: string;
  canGoNextMonth: boolean;
  isMonthPickerOpen: boolean;
  setIsMonthPickerOpen: (open: boolean) => void;
  onMonthChange: (month: string) => void;
  onShiftMonth: (direction: -1 | 1) => void;
}

export function useKpiMonthUtils() {
  const toMonthValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const shiftMonth = (monthValue: string, offset: number): string => {
    const [year, month] = monthValue.split("-").map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    return toMonthValue(date);
  };

  const monthLabel = (monthValue: string): string => {
    const [year, month] = monthValue.split("-").map(Number);
    return format(new Date(year, month - 1, 1), "LLLL yyyy", { locale: ru });
  };

  const canGoNextMonth = (
    selectedMonth: string,
    currentMonth: string,
  ): boolean => {
    return selectedMonth < currentMonth;
  };

  return {
    toMonthValue,
    shiftMonth,
    monthLabel,
    canGoNextMonth,
  };
}

export default function KpiMonthPicker({
  selectedMonth,
  currentMonthValue,
  canGoNextMonth,
  isMonthPickerOpen,
  setIsMonthPickerOpen,
  onMonthChange,
  onShiftMonth,
}: KpiMonthPickerProps) {
  const { toMonthValue, shiftMonth, monthLabel } = useKpiMonthUtils();
  const normalizedMonthValue = selectedMonth;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Предыдущий месяц"
        className="touch-action-manipulation"
        onClick={() => onShiftMonth(-1)}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-w-52 justify-start text-left font-normal touch-action-manipulation"
            aria-label="Выбор месяца KPI"
          >
            <CalendarIcon
              className="size-4 shrink-0 opacity-70 mr-2"
              aria-hidden
            />
            <span className="truncate">{monthLabel(normalizedMonthValue)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            captionLayout="dropdown"
            month={new Date(`${normalizedMonthValue}-01T00:00:00`)}
            defaultMonth={new Date(`${normalizedMonthValue}-01T00:00:00`)}
            startMonth={new Date(2020, 0, 1)}
            endMonth={
              new Date(
                Number.parseInt(currentMonthValue.split("-")[0] ?? "0", 10),
                Number.parseInt(currentMonthValue.split("-")[1] ?? "1", 10) - 1,
                1,
              )
            }
            onMonthChange={(month) => {
              onMonthChange(toMonthValue(month));
              setIsMonthPickerOpen(false);
            }}
            disabled={() => true}
            formatters={{
              formatCaption: (date) =>
                format(date, "LLLL yyyy", { locale: ru }),
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Следующий месяц"
        className="touch-action-manipulation"
        onClick={() => onShiftMonth(1)}
        disabled={!canGoNextMonth}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="touch-action-manipulation"
        onClick={() => onMonthChange(shiftMonth(currentMonthValue, -1))}
      >
        -1 мес
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="touch-action-manipulation hidden md:inline-flex"
        onClick={() => onMonthChange(shiftMonth(currentMonthValue, -3))}
      >
        -3 мес
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="touch-action-manipulation hidden lg:inline-flex"
        onClick={() => onMonthChange(shiftMonth(currentMonthValue, -6))}
      >
        -6 мес
      </Button>
    </div>
  );
}
