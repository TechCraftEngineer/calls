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
}

export const callsEnrichStats = {
  async enrichStatsWithKpi(
    stats: Record<string, ManagerStatsRow>,
    workspaceId: string,
  ): Promise<Record<string, EnrichedManagerStats>> {
    // Получаем KPI данные сотрудников через правильную связь
    const employees = await db
      .select({
        internalNumber: schema.workspacePbxNumbers.extension,
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
          eq(schema.workspacePbxEmployees.externalId, schema.workspacePbxNumbers.employeeExternalId)
        )
      )
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, workspaceId),
          eq(schema.workspacePbxEmployees.isActive, true),
          eq(schema.workspacePbxNumbers.isActive, true),
        ),
      );


    const kpiMapByNumber = new Map<string, {
      kpiBaseSalary?: number;
      kpiTargetBonus?: number;
      kpiTargetTalkTimeMinutes?: number;
    }>();
    for (const emp of employees) {
      if (emp.internalNumber) {
        const cleanNumber = String(emp.internalNumber).trim();
        kpiMapByNumber.set(cleanNumber, {
          kpiBaseSalary: emp.kpiBaseSalary,
          kpiTargetBonus: emp.kpiTargetBonus,
          kpiTargetTalkTimeMinutes: emp.kpiTargetTalkTimeMinutes,
        });
      }
    }


    // Обогащаем статистику KPI данными
    const enrichedStats: Record<string, EnrichedManagerStats> = {};
    for (const [name, stat] of Object.entries(stats)) {
      const cleanInternalNumber = stat.internalNumber ? String(stat.internalNumber).trim() : null;
      let kpiData = cleanInternalNumber ? kpiMapByNumber.get(cleanInternalNumber) : null;
      
      // Вычисляем KPI метрики
      const incomingTotal = stat.incoming?.totalDuration ?? ((stat.incoming?.duration ?? 0) * (stat.incoming?.count ?? 0));
      const outgoingTotal = stat.outgoing?.totalDuration ?? ((stat.outgoing?.duration ?? 0) * (stat.outgoing?.count ?? 0));
      const totalMinutes = Math.round((incomingTotal + outgoingTotal) / 60);
      
      const targetTalkTimeMinutes = kpiData?.kpiTargetTalkTimeMinutes ?? 0;
      const completionPercentage = targetTalkTimeMinutes > 0 
        ? Math.min(100, Math.round((totalMinutes / targetTalkTimeMinutes) * 100))
        : 0;
      
      const calculatedBonus = targetTalkTimeMinutes > 0 && completionPercentage > 0
        ? Math.round((kpiData?.kpiTargetBonus ?? 0) * (completionPercentage / 100))
        : 0;
      
      const totalSalary = (kpiData?.kpiBaseSalary ?? 0) + calculatedBonus;

      enrichedStats[name] = {
        ...stat,
        kpiBaseSalary: kpiData?.kpiBaseSalary,
        kpiTargetBonus: kpiData?.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: targetTalkTimeMinutes,
        kpiActualTalkTimeMinutes: totalMinutes,
        kpiCompletionPercentage: completionPercentage,
        kpiCalculatedBonus: calculatedBonus,
        kpiTotalSalary: totalSalary,
      };
    }

    return enrichedStats;
  },
};
