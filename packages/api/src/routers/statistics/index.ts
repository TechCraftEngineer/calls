import type { AnyProcedure } from "@orpc/server";
import { getKpi } from "./get-kpi";
import { getKpiDaily } from "./get-kpi-daily";
import { getMetrics } from "./get-metrics";
import { getMonthlyKpiGrid } from "./get-monthly-kpi-grid";
import { getStatistics } from "./get-statistics";
import { updateKpiEmployee } from "./update-kpi-employee";

export const statisticsRouter = {
  getStatistics,
  getMetrics,
  getKpi,
  getKpiDaily,
  getMonthlyKpiGrid,
  updateKpiEmployee,
} satisfies Record<string, AnyProcedure>;
