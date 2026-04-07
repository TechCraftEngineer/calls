/**
 * Statistics and analytics operations for calls
 */

import type { DailyKpiStat, GetDailyKpiStatsInput } from "./get-daily-kpi-stats";
import { getDailyKpiStats as getDailyKpiStatsFn } from "./get-daily-kpi-stats";
import type { ManagerStatsRow } from "./get-evaluations-stats";
import {
  getCallSummariesByManager as getCallSummariesByManagerFn,
  getEvaluationsStats as getEvaluationsStatsFn,
  getLowRatedCallsCount as getLowRatedCallsCountFn,
} from "./get-evaluations-stats";
import { getKpiStats as getKpiStatsFn } from "./get-kpi-stats";
import { getCallsMetrics } from "./get-metrics";
import type { CallStatus } from "../../utils/call-status";

export const callsStats = {
  async getMetrics(params?: {
    workspaceId?: string;
    excludePhoneNumbers?: string[];
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    mobileNumbers?: string[];
    directions?: ("inbound" | "outbound")[];
    managerInternalNumbers?: string[];
    statuses?: CallStatus[];
    managerInternalNumbersForQuery?: string[];
    q?: string;
  }) {
    return getCallsMetrics(params);
  },

  async getEvaluationsStats(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
  }): Promise<Record<string, ManagerStatsRow>> {
    return getEvaluationsStatsFn(params);
  },

  async getLowRatedCallsCount(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
    maxScore?: number;
  }): Promise<Record<string, number>> {
    return getLowRatedCallsCountFn(params);
  },

  async getCallSummariesByManager(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
    limitPerManager?: number;
  }): Promise<Record<string, string[]>> {
    return getCallSummariesByManagerFn(params);
  },

  async getKpiStats(params: {
    workspaceId: string;
    dateFrom: string;
    dateTo: string;
    excludePhoneNumbers?: string[];
  }) {
    return getKpiStatsFn(params);
  },

  async getDailyKpiStats(input: GetDailyKpiStatsInput): Promise<DailyKpiStat[]> {
    return getDailyKpiStatsFn(input);
  },
};
