/**
 * Типы для отчетов
 */

export interface ManagerStats {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number; totalDuration?: number };
  outgoing: { count: number; duration: number; totalDuration?: number };
  avgManagerScore?: number | null;
  evaluatedCount?: number;
  // KPI данные
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
  kpiActualPerformanceRubles?: number; // Факт выполнения в рублях
}

export interface PreparedStats {
  name: string;
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  incomingAvgDurationSec: number;
  outgoingAvgDurationSec: number;
  avgManagerScore?: number | null;
  evaluatedCount: number;
  // KPI данные
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
  kpiActualPerformanceRubles?: number; // Факт выполнения в рублях
}

export interface FormatReportParams {
  stats: Record<string, ManagerStats>;
  dateFrom: Date;
  dateTo: Date;
  reportType: "daily" | "weekly" | "monthly";
  isManagerReport: boolean;
  workspaceName?: string;
  detailed?: boolean;
  includeAvgRating?: boolean;
  includeAvgValue?: boolean;
  /** Звонки с низкой оценкой по менеджерам (managerScore < 3) */
  lowRatedCalls?: Record<string, number>;
  /** Включать KPI данные в отчет */
  includeKpi?: boolean;
  /** Включать саммари звонков (внутреннее поле) */
  _includeCallSummaries?: boolean;
  /** Саммари по менеджерам (внутреннее поле) */
  _callSummariesByManager?: Record<string, string[]>;
}

export interface StatsTotals {
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  incomingTotalDurationSec: number;
  outgoingTotalDurationSec: number;
  evaluatedCount: number;
  // KPI итоги
  totalBaseSalary: number;
  totalTargetBonus: number;
  totalCalculatedBonus: number;
  totalSalary: number;
  totalActualPerformanceRubles: number; // Факт выполнения в рублях
  totalKpiTargetTalkTimeMinutes: number; // План минут по KPI
  totalKpiActualTalkTimeMinutes: number; // Факт минут по KPI
}

export interface PreparedStatsResult {
  managers: PreparedStats[];
  totals: StatsTotals;
}
