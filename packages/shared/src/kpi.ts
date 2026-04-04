/**
 * Shared KPI types used across API and client
 */

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
