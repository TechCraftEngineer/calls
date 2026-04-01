/**
 * Обработка и подготовка статистики для отчетов
 */

import type { ManagerStats, PreparedStats, StatsTotals, PreparedStatsResult } from "./types";

export function prepareStats(entries: [string, ManagerStats][]): PreparedStatsResult {
  const managers: PreparedStats[] = [];
  let incomingCount = 0;
  let outgoingCount = 0;
  let incomingTotalDurationSec = 0;
  let outgoingTotalDurationSec = 0;
  let evaluatedCount = 0;
  // KPI итоги
  let totalBaseSalary = 0;
  let totalTargetBonus = 0;
  let totalCalculatedBonus = 0;
  let totalSalary = 0;
  let totalActualPerformanceRubles = 0;

  for (const [name, raw] of entries) {
    if (!raw || typeof raw !== "object") continue;
    const inCount = raw.incoming?.count ?? 0;
    const outCount = raw.outgoing?.count ?? 0;
    const inTotalSec = raw.incoming?.totalDuration ?? (raw.incoming?.duration ?? 0) * inCount;
    const outTotalSec = raw.outgoing?.totalDuration ?? (raw.outgoing?.duration ?? 0) * outCount;
    const inAvgSec = inCount > 0 ? inTotalSec / inCount : 0;
    const outAvgSec = outCount > 0 ? outTotalSec / outCount : 0;
    const total = inCount + outCount;
    const evalCount = raw.evaluatedCount ?? 0;

    incomingCount += inCount;
    outgoingCount += outCount;
    incomingTotalDurationSec += inTotalSec;
    outgoingTotalDurationSec += outTotalSec;
    evaluatedCount += evalCount;

    // KPI итоги
    totalBaseSalary += raw.kpiBaseSalary ?? 0;
    totalTargetBonus += raw.kpiTargetBonus ?? 0;
    totalCalculatedBonus += raw.kpiCalculatedBonus ?? 0;
    totalSalary += raw.kpiTotalSalary ?? 0;
    totalActualPerformanceRubles += raw.kpiActualPerformanceRubles ?? 0;

    managers.push({
      name,
      incomingCount: inCount,
      outgoingCount: outCount,
      totalCount: total,
      incomingAvgDurationSec: inAvgSec,
      outgoingAvgDurationSec: outAvgSec,
      avgManagerScore: raw.avgManagerScore,
      evaluatedCount: evalCount,
      // KPI данные
      kpiBaseSalary: raw.kpiBaseSalary,
      kpiTargetBonus: raw.kpiTargetBonus,
      kpiTargetTalkTimeMinutes: raw.kpiTargetTalkTimeMinutes,
      kpiActualTalkTimeMinutes: raw.kpiActualTalkTimeMinutes,
      kpiCompletionPercentage: raw.kpiCompletionPercentage,
      kpiCalculatedBonus: raw.kpiCalculatedBonus,
      kpiTotalSalary: raw.kpiTotalSalary,
      kpiActualPerformanceRubles: raw.kpiActualPerformanceRubles,
    });
  }

  managers.sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));

  return {
    managers,
    totals: {
      incomingCount,
      outgoingCount,
      totalCount: incomingCount + outgoingCount,
      incomingTotalDurationSec,
      outgoingTotalDurationSec,
      evaluatedCount,
      // KPI итоги
      totalBaseSalary,
      totalTargetBonus,
      totalCalculatedBonus,
      totalSalary,
      totalActualPerformanceRubles,
    },
  };
}

export function computeOverallAverages(managers: PreparedStats[]): {
  avgManagerScore: number | null;
} {
  let scoreWeightedSum = 0;
  let scoreWeight = 0;

  for (const item of managers) {
    const weight = item.evaluatedCount ?? 0;
    if (weight <= 0) continue;
    if (typeof item.avgManagerScore === "number") {
      scoreWeightedSum += item.avgManagerScore * weight;
      scoreWeight += weight;
    }
  }

  return {
    avgManagerScore: scoreWeight > 0 ? scoreWeightedSum / scoreWeight : null,
  };
}

export function calculateTotalMinutes(totals: StatsTotals): number {
  return Math.round(
    (totals.incomingTotalDurationSec + totals.outgoingTotalDurationSec) / 60,
  );
}

export function calculateManagerTotalMinutes(manager: PreparedStats): number {
  return Math.round(
    (manager.incomingAvgDurationSec * manager.incomingCount +
      manager.outgoingAvgDurationSec * manager.outgoingCount) /
      60,
  );
}
