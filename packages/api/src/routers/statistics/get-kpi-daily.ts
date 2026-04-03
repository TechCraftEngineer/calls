import { callsService, pbxService, settingsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
}

function calculateDaysInPeriod(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface DailyKpiRow {
  date: string;
  employeeExternalId: string;
  employeeName: string;
  employeeEmail: string;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
  actualTalkTimeMinutes: number;
  targetTalkTimeMinutes: number;
  completionPercentage: number;
  dailyBonus: number;
}

export const getKpiDaily = workspaceAdminProcedure
  .input(
    z
      .object({
        employeeExternalId: z.string().min(1, "employeeExternalId обязателен"),
        startDate: z.string().refine((date) => validateDate(date), {
          message: "Некорректный формат даты. Ожидается YYYY-MM-DD",
        }),
        endDate: z.string().refine((date) => validateDate(date), {
          message: "Некорректный формат даты. Ожидается YYYY-MM-DD",
        }),
      })
      .refine((data) => data.startDate <= data.endDate, {
        message: "startDate должна быть <= endDate",
      })
      .refine(
        (data) => {
          const days = calculateDaysInPeriod(data.startDate, data.endDate);
          return days <= 90;
        },
        { message: "Период не может превышать 90 дней" },
      ),
  )
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const { employeeExternalId, startDate, endDate } = input;

    const dateFrom = `${startDate} 00:00:00`;
    const dateTo = `${endDate} 23:59:59`;

    // Получаем данные сотрудника
    const pbxEmployees = await pbxService.listEmployees(workspaceId);
    const employee = pbxEmployees.find((emp) => emp.externalId === employeeExternalId);

    if (!employee) {
      throw new ORPCError("NOT_FOUND", {
        message: `Сотрудник с ID ${employeeExternalId} не найден`,
      });
    }

    // Получаем настройки исключения номеров
    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

    // Получаем дневную статистику
    const dailyStats = await callsService.getDailyKpiStats({
      workspaceId,
      employeeExternalId,
      dateFrom,
      dateTo,
      excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
    });

    // Получаем KPI настройки сотрудника
    const targetBonus = employee.kpiTargetBonus ?? 0;
    const monthlyTargetTalkTime = employee.kpiTargetTalkTimeMinutes ?? 0;

    // Формируем имя сотрудника
    const firstName = employee.firstName ?? "";
    const lastName = employee.lastName ?? "";
    const employeeName =
      [firstName, lastName].filter(Boolean).join(" ") || employee.displayName || "—";
    const employeeEmail = employee.email ?? "";

    // Рассчитываем дневные показатели
    const rows: DailyKpiRow[] = dailyStats.map((stat) => {
      const statDate = new Date(stat.date);
      const daysInMonth = getDaysInMonth(statDate.getFullYear(), statDate.getMonth());

      // Дневная цель = месячная цель / дни в месяце
      const dailyTargetTalkTime =
        monthlyTargetTalkTime > 0 ? Math.round(monthlyTargetTalkTime / daysInMonth) : 0;

      // Фактическое время в минутах
      const actualTalkTime = Math.round(stat.totalDurationSeconds / 60);

      // Процент выполнения
      const completionPercentage =
        dailyTargetTalkTime > 0
          ? Math.min(100, Math.round((actualTalkTime / dailyTargetTalkTime) * 100))
          : 0;

      // Дневной бонус = (целевой месячный бонус × процент выполнения дня) / количество дней в месяце
      const dailyBonus =
        targetBonus > 0 && dailyTargetTalkTime > 0
          ? Math.round((targetBonus * completionPercentage) / 100 / daysInMonth)
          : 0;

      return {
        date: stat.date,
        employeeExternalId,
        employeeName,
        employeeEmail,
        totalCalls: stat.totalCalls,
        incoming: stat.incoming,
        outgoing: stat.outgoing,
        missed: stat.missed,
        actualTalkTimeMinutes: actualTalkTime,
        targetTalkTimeMinutes: dailyTargetTalkTime,
        completionPercentage,
        dailyBonus,
      };
    });

    return rows;
  });
