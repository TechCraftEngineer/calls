"use client";

import {
  Button,
  Card,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import { skipToken, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";

// Утилиты для работы с датами
const pad2 = (value: number) => value.toString().padStart(2, "0");
const toMonthValue = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const getCurrentMonthValue = () => toMonthValue(new Date());

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${pad2(month)}-01`,
    endDate: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

function getDaysInMonth(monthValue: string): string[] {
  const [year, month] = monthValue.split("-").map(Number);
  const daysCount = new Date(year, month, 0).getDate();
  const days: string[] = [];

  for (let day = 1; day <= daysCount; day++) {
    days.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }

  return days;
}

function shiftMonth(monthValue: string, delta: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return toMonthValue(date);
}

function monthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

// Форматирование денег
function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
function getCellColor(percentage: number): string {
  if (percentage >= 100) return "bg-green-50 text-green-900";
  if (percentage >= 80) return "bg-yellow-50 text-yellow-900";
  if (percentage >= 50) return "bg-orange-50 text-orange-900";
  return "bg-red-50 text-red-900";
}

export default function MonthlyGridTable() {
  const { activeWorkspace } = useWorkspace();
  const orpc = useORPC();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());

  const { startDate, endDate } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const daysInMonth = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth]);

  // Загружаем данные для всех сотрудников за месяц
  const queryOptions = orpc.statistics.getMonthlyKpiGrid.queryOptions({
    input: activeWorkspace?.id
      ? {
          startDate,
          endDate,
        }
      : skipToken,
  });
  const {
    data: gridData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...queryOptions,
  });

  const handlePrevMonth = () => setSelectedMonth(shiftMonth(selectedMonth, -1));
  const handleNextMonth = () => setSelectedMonth(shiftMonth(selectedMonth, 1));
  const handleCurrentMonth = () => setSelectedMonth(getCurrentMonthValue());

  if (isLoading) {
    return (
      <Card className="card p-6 mt-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card p-6 mt-6">
        <div className="text-center py-12 space-y-4">
          <p className="text-red-500 font-medium">Ошибка загрузки данных</p>
          <p className="text-sm text-gray-600">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="mt-2"
          >
            {isLoading ? "Загрузка…" : "Повторить"}
          </Button>
        </div>
      </Card>
    );
  }

  if (!gridData || gridData.length === 0) {
    return (
      <Card className="card p-6 mt-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card p-0 overflow-hidden mt-6">
      {/* Заголовок с навигацией по месяцам */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          KPI сотрудников по дням — {monthLabel(selectedMonth)}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentMonth}
            disabled={selectedMonth === getCurrentMonthValue()}
            aria-label="Текущий месяц"
          >
            Текущий месяц
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Таблица с горизонтальным скроллом */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-white min-w-[200px] border-r">
                Сотрудник
              </TableHead>
              {daysInMonth.map((date) => {
                const day = date.split("-")[2];
                return (
                  <TableHead key={date} className="text-center min-w-[80px] p-2">
                    <div className="text-xs font-medium">{day}</div>
                  </TableHead>
                );
              })}
              <TableHead className="text-center min-w-[100px] p-2 bg-gray-50 border-l font-semibold">
                <div className="text-xs">Итого</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gridData.map((employee) => (
              <TableRow key={employee.employeeExternalId}>
                <TableCell className="sticky left-0 z-10 bg-white border-r font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">{employee.employeeName}</span>
                    <span className="text-xs text-gray-500">{employee.employeeEmail}</span>
                  </div>
                </TableCell>
                {daysInMonth.map((date) => {
                  const dayData = employee.days.find((d) => d.date === date);

                  if (!dayData || dayData.totalCalls === 0) {
                    return (
                      <TableCell key={date} className="text-center p-2">
                        <div className="text-xs text-gray-400">—</div>
                      </TableCell>
                    );
                  }

                  const colorClass = getCellColor(dayData.completionPercentage);

                  return (
                    <TableCell key={date} className={`text-center p-2 ${colorClass}`}>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-xs font-semibold">
                          {dayData.completionPercentage.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-gray-600">{dayData.actualMinutes}м</div>
                        {dayData.calculatedBonus > 0 && (
                          <div className="text-[10px] font-medium text-green-700">
                            +{formatMoney(dayData.calculatedBonus)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
                {/* Итоговая ячейка с суммарными данными по сотруднику */}
                {(() => {
                  const totalMinutes = employee.days.reduce((sum, d) => sum + d.actualMinutes, 0);
                  const totalBonus = employee.days.reduce((sum, d) => sum + d.calculatedBonus, 0);
                  const avgPercentage =
                    employee.days.length > 0
                      ? Math.round(
                          employee.days.reduce((sum, d) => sum + d.completionPercentage, 0) /
                            employee.days.length,
                        )
                      : 0;
                  const colorClass = getCellColor(avgPercentage);

                  return (
                    <TableCell className={`text-center p-2 bg-gray-50 border-l ${colorClass}`}>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-xs font-semibold">{avgPercentage}%</div>
                        <div className="text-[10px] text-gray-600">{totalMinutes}м</div>
                        {totalBonus > 0 && (
                          <div className="text-[10px] font-bold text-green-700">
                            {formatMoney(totalBonus)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })()}
              </TableRow>
            ))}
          </TableBody>
          {/* Итоговая строка по всем сотрудникам */}
          <tfoot className="bg-gray-100 border-t-2">
            <TableRow>
              <TableCell className="sticky left-0 z-10 bg-gray-100 border-r font-bold text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-900">Всего по отделу</span>
                  <span className="text-xs text-gray-500">{gridData.length} сотрудников</span>
                </div>
              </TableCell>
              {daysInMonth.map((date) => {
                const dayTotalMinutes = gridData.reduce((sum, emp) => {
                  const day = emp.days.find((d) => d.date === date);
                  return sum + (day?.actualMinutes || 0);
                }, 0);
                const dayTotalBonus = gridData.reduce((sum, emp) => {
                  const day = emp.days.find((d) => d.date === date);
                  return sum + (day?.calculatedBonus || 0);
                }, 0);
                const hasData = dayTotalMinutes > 0;

                return (
                  <TableCell key={date} className="text-center p-2">
                    {hasData ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="text-xs font-semibold text-gray-700">
                          {dayTotalMinutes}м
                        </div>
                        {dayTotalBonus > 0 && (
                          <div className="text-[10px] font-bold text-green-700">
                            {formatMoney(dayTotalBonus)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">—</div>
                    )}
                  </TableCell>
                );
              })}
              {/* Итоговая ячейка для всего отдела */}
              {(() => {
                const totalMinutes = gridData.reduce(
                  (sum, emp) => sum + emp.days.reduce((dSum, d) => dSum + d.actualMinutes, 0),
                  0,
                );
                const totalBonus = gridData.reduce(
                  (sum, emp) => sum + emp.days.reduce((dSum, d) => dSum + d.calculatedBonus, 0),
                  0,
                );

                return (
                  <TableCell className="text-center p-2 bg-gray-200 border-l font-bold">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs text-gray-800">{totalMinutes}м</div>
                      {totalBonus > 0 && (
                        <div className="text-[10px] font-bold text-green-800">
                          {formatMoney(totalBonus)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                );
              })()}
            </TableRow>
          </tfoot>
        </Table>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-center gap-4 p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-50 border border-green-200" />
          <span className="text-xs text-gray-600">≥100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-200" />
          <span className="text-xs text-gray-600">80-99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-50 border border-orange-200" />
          <span className="text-xs text-gray-600">50-79%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 border border-red-200" />
          <span className="text-xs text-gray-600">&lt;50%</span>
        </div>
      </div>
    </Card>
  );
}
