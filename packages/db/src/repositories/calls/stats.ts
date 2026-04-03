/**
 * Statistics and analytics operations for calls
 */

import type { ManagerStatsRow } from "./get-evaluations-stats";
import {
  getCallSummariesByManager as getCallSummariesByManagerFn,
  getEvaluationsStats as getEvaluationsStatsFn,
  getLowRatedCallsCount as getLowRatedCallsCountFn,
} from "./get-evaluations-stats";
import { getKpiStats as getKpiStatsFn } from "./get-kpi-stats";
import { getCallsMetrics } from "./get-metrics";

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
    statuses?: ("missed" | "answered" | "voicemail" | "failed")[];
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
};
