import type { AnyProcedure } from "@orpc/server";
import { getKpi } from "./get-kpi";
import { getMetrics } from "./get-metrics";
import { getStatistics } from "./get-statistics";
import { updateKpiEmployee } from "./update-kpi-employee";

export const statisticsRouter = {
  getStatistics,
  getMetrics,
  getKpi,
  updateKpiEmployee,
} satisfies Record<string, AnyProcedure>;
