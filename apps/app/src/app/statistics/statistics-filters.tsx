"use client";

import { Button, Card, CardContent, CardHeader, Input } from "@calls/ui";

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
            <label className="filter-label">ДАТА ОТ</label>
            <Input
              type="date"
              className="date-input"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              onClick={(e) =>
                (e.currentTarget as HTMLInputElement).showPicker?.()
              }
            />
          </div>
          <div className="filter-item min-w-[150px]">
            <label className="filter-label">ДАТА ДО</label>
            <Input
              type="date"
              className="date-input"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              onClick={(e) =>
                (e.currentTarget as HTMLInputElement).showPicker?.()
              }
            />
          </div>
          <div className="flex gap-3">
            <Button variant="accent" onClick={onApply}>
              Применить
            </Button>
            <Button variant="outline" onClick={onReset}>
              Сбросить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
