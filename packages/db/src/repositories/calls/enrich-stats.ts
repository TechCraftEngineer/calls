/**
 * Statistics enrichment operations
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { ManagerStatsRow } from "./get-evaluations-stats";

export interface EnrichedManagerStats extends ManagerStatsRow {
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
  kpiActualPerformanceRubles?: number; // Факт выполнения в рублях
}

export const callsEnrichStats = {
  async enrichStatsWithKpi(
    stats: Record<string, ManagerStatsRow>,
    workspaceId: string,
    reportType?: "daily" | "weekly" | "monthly",
  ): Promise<Record<string, EnrichedManagerStats>> {
    // Вычисление плана и бонуса в зависимости от типа отчета
    const calculateTargetPlan = (monthlyTargetMinutes: number): number => {
      if (!monthlyTargetMinutes || monthlyTargetMinutes <= 0) return 0;
      
      switch (reportType) {
        case "daily":
          // Дневной план = месячный план / 22 рабочих дня
          return Math.round(monthlyTargetMinutes / 22);
        case "weekly":
          // Недельный план = месячный план / 4 недели
          return Math.round(monthlyTargetMinutes / 4);
        case "monthly":
          // Месячный план остается без изменений
          return monthlyTargetMinutes;
        default:
          return monthlyTargetMinutes;
      }
    };

    const calculateTargetBonus = (monthlyTargetBonus: number): number => {
      if (!monthlyTargetBonus || monthlyTargetBonus <= 0) return 0;
      
      switch (reportType) {
        case "daily":
          // Дневной бонус = месячный бонус / 22 рабочих дней
          return Math.round(monthlyTargetBonus / 22);
        case "weekly":
          // Недельный бонус = месячный бонус / 4 недели
          return Math.round(monthlyTargetBonus / 4);
        case "monthly":
          // Месячный бонус остается без изменений
          return monthlyTargetBonus;
        default:
          return monthlyTargetBonus;
      }
    };
    // Получаем KPI данные сотрудников через правильную связь
    const employees = await db
      .select({
        internalNumber: schema.workspacePbxNumbers.phoneNumber, // Возвращаем phoneNumber
        kpiBaseSalary: schema.workspacePbxEmployees.kpiBaseSalary,
        kpiTargetBonus: schema.workspacePbxEmployees.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: schema.workspacePbxEmployees.kpiTargetTalkTimeMinutes,
      })
      .from(schema.workspacePbxEmployees)
      .innerJoin(
        schema.workspacePbxNumbers,
        and(
          eq(schema.workspacePbxEmployees.workspaceId, schema.workspacePbxNumbers.workspaceId),
          eq(schema.workspacePbxEmployees.provider, schema.workspacePbxNumbers.provider),
          eq(
            schema.workspacePbxEmployees.externalId,
            schema.workspacePbxNumbers.employeeExternalId,
          ),
        ),
      )
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, workspaceId),
          eq(schema.workspacePbxEmployees.isActive, true),
          eq(schema.workspacePbxNumbers.isActive, true),
        ),
      );

    console.log(`[DEBUG] Found ${employees.length} employees in workspace ${workspaceId}`);
    console.log("[DEBUG] Employees:", employees.map(e => ({
      internalNumber: e.internalNumber,
      kpiBaseSalary: e.kpiBaseSalary,
      kpiTargetBonus: e.kpiTargetBonus,
      kpiTargetTalkTimeMinutes: e.kpiTargetTalkTimeMinutes,
    })));

    const kpiMapByNumber = new Map<
      string,
      {
        kpiBaseSalary?: number;
        kpiTargetBonus?: number;
        kpiTargetTalkTimeMinutes?: number;
      }
    >();
    for (const emp of employees) {
      if (emp.internalNumber) {
        const cleanNumber = String(emp.internalNumber).trim();
        if (cleanNumber) { // Проверяем, что номер не пустой после trim
          kpiMapByNumber.set(cleanNumber, {
            kpiBaseSalary: emp.kpiBaseSalary,
            kpiTargetBonus: emp.kpiTargetBonus,
            kpiTargetTalkTimeMinutes: emp.kpiTargetTalkTimeMinutes,
          });
        }
      }
    }

    console.log("[DEBUG] KPI map by number:", Object.fromEntries(kpiMapByNumber));

    // Обогащаем статистику KPI данными
    const enrichedStats: Record<string, EnrichedManagerStats> = {};
    
    console.log("[DEBUG] Input stats keys:", Object.keys(stats));
    const firstKey = Object.keys(stats)[0];
    if (firstKey) {
      console.log("[DEBUG] Sample stat:", stats[firstKey]);
    }
    
    for (const [name, stat] of Object.entries(stats)) {
      const cleanInternalNumber = stat.internalNumber ? String(stat.internalNumber).trim() : null;
      const kpiData = cleanInternalNumber ? kpiMapByNumber.get(cleanInternalNumber) : null;

      // Отладочная информация
      console.log(`[DEBUG] Processing manager: ${name}`);
      console.log(`[DEBUG] Internal number: ${cleanInternalNumber}`);
      console.log(`[DEBUG] KPI data found:`, kpiData);
      console.log(`[DEBUG] Report type: ${reportType}`);

      // Вычисляем KPI метрики
      const incomingTotal =
        stat.incoming?.totalDuration ??
        (stat.incoming?.duration ?? 0) * (stat.incoming?.count ?? 0);
      const outgoingTotal =
        stat.outgoing?.totalDuration ??
        (stat.outgoing?.duration ?? 0) * (stat.outgoing?.count ?? 0);
      const totalMinutes = Math.round((incomingTotal + outgoingTotal) / 60);

      console.log(`[DEBUG] Total minutes: ${totalMinutes}`);

      const targetTalkTimeMinutes = calculateTargetPlan(kpiData?.kpiTargetTalkTimeMinutes ?? 0);
      const targetBonus = calculateTargetBonus(kpiData?.kpiTargetBonus ?? 0);
      
      console.log(`[DEBUG] Monthly target plan: ${kpiData?.kpiTargetTalkTimeMinutes}`);
      console.log(`[DEBUG] Calculated target plan: ${targetTalkTimeMinutes}`);
      console.log(`[DEBUG] Monthly target bonus: ${kpiData?.kpiTargetBonus}`);
      console.log(`[DEBUG] Calculated target bonus: ${targetBonus}`);
      
      const completionPercentage =
        targetTalkTimeMinutes > 0
          ? Math.min(100, Math.round((totalMinutes / targetTalkTimeMinutes) * 100))
          : 0;

      console.log(`[DEBUG] Completion percentage: ${completionPercentage}%`);

      const calculatedBonus =
        targetTalkTimeMinutes > 0 && completionPercentage > 0
          ? Math.round(targetBonus * (completionPercentage / 100))
          : 0;

      console.log(`[DEBUG] Calculated bonus: ${calculatedBonus}`);

      // Для ежедневных и еженедельных отчетов не включаем оклад в итоговую сумму
      const totalSalary = (reportType === "monthly" ? (kpiData?.kpiBaseSalary ?? 0) : 0) + calculatedBonus;
      
      // Факт выполнения в рублях - это рассчитанный бонус
      const actualPerformanceRubles = calculatedBonus;

      enrichedStats[name] = {
        ...stat,
        kpiBaseSalary: kpiData?.kpiBaseSalary,
        kpiTargetBonus: kpiData?.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: targetTalkTimeMinutes,
        kpiActualTalkTimeMinutes: totalMinutes,
        kpiCompletionPercentage: completionPercentage,
        kpiCalculatedBonus: calculatedBonus,
        kpiTotalSalary: totalSalary,
        kpiActualPerformanceRubles: actualPerformanceRubles,
      };
    }

    return enrichedStats;
  },
};
