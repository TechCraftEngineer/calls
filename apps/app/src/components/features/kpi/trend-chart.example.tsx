import type { DailyKpiRow } from "@calls/shared";
import { TrendChart } from "./trend-chart";

// Пример данных для демонстрации
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
  {
    date: "2024-01-17",
    employeeExternalId: "emp-001",
    employeeName: "Иван Иванов",
    employeeEmail: "ivan@example.com",
    totalCalls: 38,
    incoming: 20,
    outgoing: 15,
    missed: 3,
    actualTalkTimeMinutes: 150,
    targetTalkTimeMinutes: 200,
    completionPercentage: 75,
    dailyBonus: 3750,
  },
  {
    date: "2024-01-18",
    employeeExternalId: "emp-001",
    employeeName: "Иван Иванов",
    employeeEmail: "ivan@example.com",
    totalCalls: 55,
    incoming: 32,
    outgoing: 21,
    missed: 2,
    actualTalkTimeMinutes: 240,
    targetTalkTimeMinutes: 200,
    completionPercentage: 120,
    dailyBonus: 6000,
  },
  {
    date: "2024-01-19",
    employeeExternalId: "emp-001",
    employeeName: "Иван Иванов",
    employeeEmail: "ivan@example.com",
    totalCalls: 42,
    incoming: 24,
    outgoing: 16,
    missed: 2,
    actualTalkTimeMinutes: 170,
    targetTalkTimeMinutes: 200,
    completionPercentage: 85,
    dailyBonus: 4250,
  },
];

export function TrendChartExample() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="mb-4 text-2xl font-bold">TrendChart - Нормальное состояние</h2>
        <TrendChart data={mockData} loading={false} />
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">TrendChart - Загрузка</h2>
        <TrendChart data={[]} loading={true} />
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">TrendChart - Пустые данные</h2>
        <TrendChart data={[]} loading={false} />
      </div>
    </div>
  );
}
