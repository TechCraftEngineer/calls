import { getKpi } from "./get-kpi";
import { getKpiDaily } from "./get-kpi-daily";
import { getMetrics } from "./get-metrics";
import { getStatistics } from "./get-statistics";
import { updateKpiEmployee } from "./update-kpi-employee";

export const statisticsRouter = {
  getStatistics,
  getMetrics,
  getKpi,
  getKpiDaily,
  updateKpiEmployee,
};
