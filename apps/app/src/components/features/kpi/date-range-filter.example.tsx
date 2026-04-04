/**
 * Пример использования компонента DateRangeFilter
 *
 * Этот файл демонстрирует, как использовать компонент DateRangeFilter
 * в вашем приложении.
 */

"use client";

import { useState } from "react";
import { DateRangeFilter } from "./date-range-filter";

export function DateRangeFilterExample() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-01-31");

  const handleChange = (newStartDate: string, newEndDate: string) => {
    console.log("Выбран период:", { newStartDate, newEndDate });
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Пример DateRangeFilter</h2>

      <DateRangeFilter startDate={startDate} endDate={endDate} onChange={handleChange} />

      <div className="mt-4 p-4 bg-muted rounded-md">
        <p className="text-sm">
          <strong>Выбранный период:</strong>
        </p>
        <p className="text-sm">Начало: {startDate}</p>
        <p className="text-sm">Конец: {endDate}</p>
      </div>
    </div>
  );
}
