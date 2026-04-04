/**
 * Пример использования компонента ExportButton
 *
 * Этот файл демонстрирует, как использовать ExportButton в вашем приложении.
 */

import type { DailyKpiRow } from "@calls/api/routers/statistics/get-kpi-daily";
import { ExportButton } from "./export-button";

// Пример данных
const mockData: DailyKpiRow[] = [
  {
    date: "2024-01-15",
    employeeExternalId: "emp-001",
    employeeName: "Иван Иванов",
    employeeEmail: "ivan@example.com",
    totalCalls: 46,
    incoming: 25,
    outgoing: 18,
    missed: 3,
    actualTalkTimeMinutes: 180,
    targetTalkTimeMinutes: 200,
    completionPercentage: 90,
    dailyBonus: 4500,
  },
  {
    date: "2024-01-16",
    employeeExternalId: "emp-001",
    employeeName: "Иван Иванов",
    employeeEmail: "ivan@example.com",
    totalCalls: 52,
    incoming: 30,
    outgoing: 20,
    missed: 2,
    actualTalkTimeMinutes: 220,
    targetTalkTimeMinutes: 200,
    completionPercentage: 110,
    dailyBonus: 5000,
  },
];

export function ExportButtonExample() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Пример ExportButton</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">С данными:</h3>
        <ExportButton
          data={mockData}
          employeeName="Иван Иванов"
          startDate="2024-01-15"
          endDate="2024-01-16"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Без данных (disabled):</h3>
        <ExportButton
          data={[]}
          employeeName="Иван Иванов"
          startDate="2024-01-15"
          endDate="2024-01-16"
        />
      </div>
    </div>
  );
}
