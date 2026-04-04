/**
 * Пример использования компонента DailyStatsTable
 *
 * Этот файл демонстрирует различные сценарии использования компонента:
 * - Таблица с данными
 * - Состояние загрузки
 * - Пустое состояние
 */

import type { DailyKpiRow } from "@calls/shared";
import { DailyStatsTable } from "./daily-stats-table";

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
];

// Пример 1: Таблица с данными
export function DailyStatsTableWithData() {
  return (
    <DailyStatsTable
      data={mockData}
      loading={false}
      employeeName="Иван Иванов"
      startDate="2024-01-15"
      endDate="2024-01-17"
    />
  );
}

// Пример 2: Состояние загрузки
export function DailyStatsTableLoading() {
  return (
    <DailyStatsTable
      data={[]}
      loading={true}
      employeeName="Иван Иванов"
      startDate="2024-01-15"
      endDate="2024-01-17"
    />
  );
}

// Пример 3: Пустое состояние
export function DailyStatsTableEmpty() {
  return (
    <DailyStatsTable
      data={[]}
      loading={false}
      employeeName="Иван Иванов"
      startDate="2024-01-15"
      endDate="2024-01-17"
    />
  );
}

// Пример 4: Большой набор данных (для демонстрации пагинации)
export function DailyStatsTableWithPagination() {
  const largeData: DailyKpiRow[] = Array.from({ length: 60 }, (_, i) => {
    // Создаем реальные календарные даты, начиная с 2024-01-01
    const baseDate = new Date(2024, 0, 1); // 1 января 2024
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

    return {
      date: dateStr,
      employeeExternalId: "emp-001",
      employeeName: "Иван Иванов",
      employeeEmail: "ivan@example.com",
      totalCalls: 40 + Math.floor(Math.random() * 20),
      incoming: 20 + Math.floor(Math.random() * 10),
      outgoing: 15 + Math.floor(Math.random() * 10),
      missed: Math.floor(Math.random() * 5),
      actualTalkTimeMinutes: 150 + Math.floor(Math.random() * 100),
      targetTalkTimeMinutes: 200,
      completionPercentage: 75 + Math.floor(Math.random() * 35),
      dailyBonus: 3750 + Math.floor(Math.random() * 2500),
    };
  });

  return (
    <DailyStatsTable
      data={largeData}
      loading={false}
      employeeName="Иван Иванов"
      startDate="2024-01-01"
      endDate="2024-01-31"
    />
  );
}
