import { and, asc, avg, count, eq, gte, inArray, isNotNull, lt, lte, sql, sum } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";

export interface GetEvaluationsStatsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  excludePhoneNumbers?: string[];
  internalNumbers?: string[];
}

export interface ManagerStatsRow {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number; totalDuration?: number };
  outgoing: { count: number; duration: number; totalDuration?: number };
  avgManagerScore?: number | null;
  evaluatedCount?: number;
}

export async function getEvaluationsStats(
  params: GetEvaluationsStatsParams,
): Promise<Record<string, ManagerStatsRow>> {
  const { workspaceId, dateFrom, dateTo, excludePhoneNumbers, internalNumbers } = params;

  const safeInternalNumbers =
    internalNumbers?.filter((n): n is string => n != null && n.trim().length > 0) ?? [];

  const conditions = [];
  if (workspaceId != null) conditions.push(eq(schema.calls.workspaceId, workspaceId));
  if (dateFrom) conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  const excludeConditionStats = buildExcludePhoneCondition(excludePhoneNumbers, schema.calls);
  if (excludeConditionStats) {
    conditions.push(excludeConditionStats);
  }
  if (safeInternalNumbers.length > 0) {
    conditions.push(inArray(schema.calls.internalNumber, safeInternalNumbers));
  }

  const query = db
    .select({
      internalNumber: schema.calls.internalNumber,
      managerName: schema.calls.name,
      direction: schema.calls.direction,
      totalCalls: count(),
      totalDuration: sum(schema.files.durationSeconds),
    })
    .from(schema.calls)
    .leftJoin(schema.files, eq(schema.calls.fileId, schema.files.id))
    .leftJoin(schema.callEvaluations, eq(schema.calls.id, schema.callEvaluations.callId))
    .groupBy(schema.calls.internalNumber, schema.calls.name, schema.calls.direction)
    .$dynamic();

  const results = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

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
    const target = dir === "inbound" ? stats[key].incoming : stats[key].outgoing;

    const totalCalls = Number(row.totalCalls ?? 0);
    const totalDuration = Number(row.totalDuration ?? 0);
    target.count += totalCalls;
    target.totalDuration = Number(target.totalDuration ?? 0) + totalDuration;
    target.duration = target.count > 0 ? Number(target.totalDuration ?? 0) / target.count : 0;
  }

  // Агрегаты оценок по менеджерам (avg rating, avg value, evaluated count)
  const evalConditions = [...conditions];
  if (safeInternalNumbers.length > 0) {
    evalConditions.push(inArray(schema.calls.internalNumber, safeInternalNumbers));
  }
  evalConditions.push(eq(schema.callEvaluations.isQualityAnalyzable, true));
  const evalQuery = db
    .select({
      managerName: schema.calls.name,
      internalNumber: schema.calls.internalNumber,
      avgManagerScore: avg(schema.callEvaluations.managerScore),
      evaluatedCount: count(schema.callEvaluations.managerScore),
    })
    .from(schema.calls)
    .innerJoin(schema.callEvaluations, eq(schema.calls.id, schema.callEvaluations.callId))
    .groupBy(schema.calls.name, schema.calls.internalNumber)
    .$dynamic();

  const evalResults =
    evalConditions.length > 0 ? await evalQuery.where(and(...evalConditions)) : await evalQuery;

  for (const row of evalResults) {
    const key = row.managerName ?? row.internalNumber ?? "Unknown";
    if (stats[key]) {
      stats[key].avgManagerScore = row.avgManagerScore != null ? Number(row.avgManagerScore) : null;
      stats[key].evaluatedCount = Number(row.evaluatedCount ?? 0);
    }
  }

  return stats;
}

export interface GetLowRatedCallsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  excludePhoneNumbers?: string[];
  internalNumbers?: string[];
  maxScore?: number;
}

export interface GetCallSummariesParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  excludePhoneNumbers?: string[];
  limitPerManager?: number;
}

/** Последние AI-саммари звонков по менеджерам */
export async function getCallSummariesByManager(
  params: GetCallSummariesParams,
): Promise<Record<string, string[]>> {
  const { workspaceId, dateFrom, dateTo, excludePhoneNumbers, limitPerManager = 3 } = params;

  const safeLimitPerManager =
    Number.isFinite(limitPerManager) && limitPerManager > 0 ? Math.floor(limitPerManager) : 3;

  const conditions = [];
  if (workspaceId != null) conditions.push(eq(schema.calls.workspaceId, workspaceId));
  if (dateFrom) conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  const excludeCondition = buildExcludePhoneCondition(excludePhoneNumbers, schema.calls);
  if (excludeCondition) {
    conditions.push(excludeCondition);
  }
  conditions.push(isNotNull(schema.transcripts.summary));
  conditions.push(sql`trim(${schema.transcripts.summary}) != ''`);

  const rankedSummaries = db
    .select({
      managerName: schema.calls.name,
      internalNumber: schema.calls.internalNumber,
      summary: schema.transcripts.summary,
      rn: sql<number>`row_number() over (
        partition by coalesce(${schema.calls.name}, ${schema.calls.internalNumber}, 'Unknown')
        order by ${schema.calls.timestamp} desc, ${schema.calls.id} desc
      )`.as("rn"),
    })
    .from(schema.calls)
    .innerJoin(schema.transcripts, eq(schema.calls.id, schema.transcripts.callId))
    .where(and(...conditions))
    .as("ranked_summaries");

  const rows = await db
    .select({
      managerName: rankedSummaries.managerName,
      internalNumber: rankedSummaries.internalNumber,
      summary: rankedSummaries.summary,
    })
    .from(rankedSummaries)
    .where(lte(rankedSummaries.rn, safeLimitPerManager))
    .orderBy(
      asc(
        sql`coalesce(${rankedSummaries.managerName}, ${rankedSummaries.internalNumber}, 'Unknown')`,
      ),
      asc(rankedSummaries.rn),
    );

  const result: Record<string, string[]> = {};
  for (const row of rows) {
    const summary = row.summary?.trim();
    if (!summary) continue;
    const key = row.managerName ?? row.internalNumber ?? "Unknown";
    if (!result[key]) {
      result[key] = [];
    }
    if (!result[key].includes(summary)) {
      result[key].push(summary);
    }
  }

  return result;
}

/** Количество звонков с низкой оценкой (managerScore < maxScore) по менеджерам */
export async function getLowRatedCallsCount(
  params: GetLowRatedCallsParams,
): Promise<Record<string, number>> {
  const {
    workspaceId,
    dateFrom,
    dateTo,
    excludePhoneNumbers,
    internalNumbers,
    maxScore = 3,
  } = params;

  if (workspaceId == null) return {};

  const safeInternalNumbers =
    internalNumbers?.filter((n): n is string => n != null && n.trim().length > 0) ?? [];

  const conditions = [
    eq(schema.calls.workspaceId, workspaceId),
    lt(schema.callEvaluations.managerScore, maxScore),
    eq(schema.callEvaluations.isQualityAnalyzable, true),
  ];
  if (dateFrom) conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  const excludeConditionLowRated = buildExcludePhoneCondition(excludePhoneNumbers, schema.calls);
  if (excludeConditionLowRated) {
    conditions.push(excludeConditionLowRated);
  }
  if (safeInternalNumbers.length > 0) {
    conditions.push(inArray(schema.calls.internalNumber, safeInternalNumbers));
  }

  const rows = await db
    .select({
      managerName: schema.calls.name,
      internalNumber: schema.calls.internalNumber,
      count: count(),
    })
    .from(schema.calls)
    .innerJoin(schema.callEvaluations, eq(schema.calls.id, schema.callEvaluations.callId))
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
