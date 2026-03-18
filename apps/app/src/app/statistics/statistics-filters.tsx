"use client";

import { Button, Card, CardContent, CardHeader, DatePicker } from "@calls/ui";

interface StatisticsFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function StatisticsFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onReset,
}: StatisticsFiltersProps) {
  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-0">
        <div className="section-title mb-5 flex items-center gap-2">
          Фильтрация статистики <span className="text-sm">📅</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex gap-6 items-end flex-wrap">
          <div className="filter-item min-w-[150px]">
            <label htmlFor="date-from" className="filter-label">
              ДАТА ОТ
            </label>
            <DatePicker
              id="date-from"
              value={dateFrom}
              onChange={onDateFromChange}
              placeholder="Выберите дату... (например 31.12.2023)"
            />
          </div>
          <div className="filter-item min-w-[150px]">
            <label htmlFor="date-to" className="filter-label">
              ДАТА ДО
            </label>
            <DatePicker
              id="date-to"
              value={dateTo}
              onChange={onDateToChange}
              placeholder="Выберите дату... (например ДД.ММ.ГГГГ)"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="default" onClick={onApply}>
              Применить
            </Button>
            <Button
              variant="link"
              onClick={onReset}
              className="text-foreground"
            >
              Сбросить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
