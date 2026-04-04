import { callsService, parseDateToUTC, pbxService } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

const inputSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Дата должна быть в формате ГГГГ-ММ-ДД",
    }),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Дата должна быть в формате ГГГГ-ММ-ДД",
    }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Дата окончания должна быть больше или равна дате начала",
  });

export interface DayData {
  date: string;
  actualMinutes: number;
  targetMinutes: number;
  completionPercentage: number;
  totalCalls: number;
}

export const getMonthlyKpiGrid = workspaceAdminProcedure
  .input(inputSchema)
  .handler(async ({ input, context }) => {
    const { startDate, endDate } = input;
    const { workspaceId } = context;

    // Получаем всех активных сотрудников с настройками KPI
    const employees = await pbxService.listEmployees(workspaceId);
    const activeEmployees = employees.filter(
      (emp) => emp.isActive && (emp.kpiTargetTalkTimeMinutes || 0) > 0,
    );

    if (activeEmployees.length === 0) {
      return [];
    }

    // Вычисляем количество дней в периоде для расчета дневной цели
    const start = parseDateToUTC(startDate);
    const end = parseDateToUTC(endDate);
    const daysInMonth = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Загружаем данные для всех сотрудников параллельно
    const results = await Promise.all(
      activeEmployees
        .filter((emp) => !!emp.externalId)
        .map(async (employee) => {
          const dailyStats = await callsService.getDailyKpiStats({
            workspaceId,
            employeeExternalId: employee.externalId,
            dateFrom: `${startDate} 00:00:00`,
            dateTo: `${endDate} 23:59:59`,
          });

          const targetTalkTimeMinutes = employee.kpiTargetTalkTimeMinutes || 0;
          // Примечание: дневная цель = месячная цель / кол-во календарных дней
          // В будущем может потребоваться учёт только рабочих дней
          const dailyTargetMinutes = Math.round(targetTalkTimeMinutes / daysInMonth);

          const days: DayData[] = dailyStats.map((stat) => {
            const actualMinutes = Math.round(stat.totalDurationSeconds / 60);
            const completionPercentage =
              dailyTargetMinutes > 0 ? Math.round((actualMinutes / dailyTargetMinutes) * 100) : 0;

            return {
              date: stat.date,
              actualMinutes,
              targetMinutes: dailyTargetMinutes,
              completionPercentage,
              totalCalls: stat.totalCalls,
            };
          });

          const firstName = employee.firstName ?? "";
          const lastName = employee.lastName ?? "";
          const employeeName =
            [firstName, lastName].filter(Boolean).join(" ") || employee.displayName || "Без имени";

          return {
            employeeExternalId: employee.externalId,
            employeeName,
            employeeEmail: employee.email || "",
            days,
          };
        }),
    );

    return results;
  });
