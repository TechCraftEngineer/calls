import { and, avg, count, eq, gte, inArray, lt, lte, sum } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";

export interface GetEvaluationsStatsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  excludePhoneNumbers?: string[];
}

export interface ManagerStatsRow {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number; totalDuration?: number };
  outgoing: { count: number; duration: number; totalDuration?: number };
  avgManagerScore?: number | null;
  avgValueScore?: number | null;
  evaluatedCount?: number;
}

export async function getEvaluationsStats(
  params: GetEvaluationsStatsParams,
): Promise<Record<string, ManagerStatsRow>> {
  const {
    workspaceId,
    dateFrom,
    dateTo,
    internalNumbers,
    excludePhoneNumbers,
  } = params;

  const conditions = [];
  if (workspaceId != null)
    conditions.push(eq(schema.calls.workspaceId, workspaceId));
  if (dateFrom)
    conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  if (internalNumbers?.length) {
    conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
  }
  const excludeConditionStats = buildExcludePhoneCondition(
    excludePhoneNumbers,
    schema.calls,
  );
  if (excludeConditionStats) {
    conditions.push(excludeConditionStats);
  }

  const query = db
    .select({
      internalNumber: schema.calls.internalNumber,
      managerName: schema.calls.name,
      direction: schema.calls.direction,
      totalCalls: count(),
      totalDuration: sum(schema.calls.duration),
    })
    .from(schema.calls)
    .leftJoin(
      schema.callEvaluations,
      eq(schema.calls.id, schema.callEvaluations.callId),
    )
    .groupBy(
      schema.calls.internalNumber,
      schema.calls.name,
      schema.calls.direction,
    )
    .$dynamic();

  const results =
    conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  const stats: Record<string, ManagerStatsRow> = {};

  for (const row of results) {
    const key = row.managerName ?? row.internalNumber ?? "Unknown";
    if (!stats[key]) {
      stats[key] = {
        name: key,
        internalNumber: row.internalNumber,
        incoming: { count: 0, duration: 0, totalDuration: 0 },
        outgoing: { count: 0, duration: 0, totalDuration: 0 },
      };
    }

    const dir = String(row.direction ?? "")
      .trim()
      .toLowerCase();
    const target =
      dir === "inbound" ? stats[key].incoming : stats[key].outgoing;

    const totalCalls = Number(row.totalCalls ?? 0);
    const totalDuration = Number(row.totalDuration ?? 0);
    target.count += totalCalls;
    target.totalDuration = Number(target.totalDuration ?? 0) + totalDuration;
    target.duration =
      target.count > 0 ? Number(target.totalDuration ?? 0) / target.count : 0;
  }

  // Агрегаты оценок по менеджерам (avg rating, avg value, evaluated count)
  const evalConditions = [...conditions];
  evalConditions.push(eq(schema.callEvaluations.isQualityAnalyzable, true));
  const evalQuery = db
    .select({
      managerName: schema.calls.name,
      internalNumber: schema.calls.internalNumber,
      avgManagerScore: avg(schema.callEvaluations.managerScore),
      avgValueScore: avg(schema.callEvaluations.valueScore),
      evaluatedCount: count(schema.callEvaluations.managerScore),
    })
    .from(schema.calls)
    .innerJoin(
      schema.callEvaluations,
      eq(schema.calls.id, schema.callEvaluations.callId),
    )
    .groupBy(schema.calls.name, schema.calls.internalNumber)
    .$dynamic();

  const evalResults =
    evalConditions.length > 0
      ? await evalQuery.where(and(...evalConditions))
      : await evalQuery;

  for (const row of evalResults) {
    const key = row.managerName ?? row.internalNumber ?? "Unknown";
    if (stats[key]) {
      stats[key].avgManagerScore =
        row.avgManagerScore != null ? Number(row.avgManagerScore) : null;
      stats[key].avgValueScore =
        row.avgValueScore != null ? Number(row.avgValueScore) : null;
      stats[key].evaluatedCount = Number(row.evaluatedCount ?? 0);
    }
  }

  return stats;
}

export interface GetLowRatedCallsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  excludePhoneNumbers?: string[];
  maxScore?: number;
}

/** Количество звонков с низкой оценкой (managerScore < maxScore) по менеджерам */
export async function getLowRatedCallsCount(
  params: GetLowRatedCallsParams,
): Promise<Record<string, number>> {
  const {
    workspaceId,
    dateFrom,
    dateTo,
    internalNumbers,
    excludePhoneNumbers,
    maxScore = 3,
  } = params;

  if (workspaceId == null) return {};

  const conditions = [
    eq(schema.calls.workspaceId, workspaceId),
    lt(schema.callEvaluations.managerScore, maxScore),
    eq(schema.callEvaluations.isQualityAnalyzable, true),
  ];
  if (dateFrom)
    conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  if (internalNumbers?.length) {
    conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
  }
  const excludeConditionLowRated = buildExcludePhoneCondition(
    excludePhoneNumbers,
    schema.calls,
  );
  if (excludeConditionLowRated) {
    conditions.push(excludeConditionLowRated);
  }

  const rows = await db
    .select({
      managerName: schema.calls.name,
      internalNumber: schema.calls.internalNumber,
      count: count(),
    })
    .from(schema.calls)
    .innerJoin(
      schema.callEvaluations,
      eq(schema.calls.id, schema.callEvaluations.callId),
    )
    .where(and(...conditions))
    .groupBy(schema.calls.name, schema.calls.internalNumber);

  const result: Record<string, number> = {};
  for (const row of rows) {
    const key = row.managerName ?? row.internalNumber ?? "Unknown";
    const n = Number(row.count ?? 0);
    if (n > 0) result[key] = n;
  }
  return result;
}
