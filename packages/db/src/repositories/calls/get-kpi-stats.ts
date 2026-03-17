import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";

export interface GetKpiStatsParams {
  workspaceId: string;
  dateFrom: string;
  dateTo: string;
}

export interface KpiStatsByInternalNumber {
  internalNumber: string;
  totalDurationSeconds: number;
  incoming: number;
  outgoing: number;
  missed: number;
  totalCalls: number;
}

/**
 * Возвращает статистику звонков по internal_number за период.
 * duration в calls — секунды.
 */
export async function getKpiStats(
  params: GetKpiStatsParams,
): Promise<KpiStatsByInternalNumber[]> {
  const { workspaceId, dateFrom, dateTo } = params;

  const results = await db
    .select({
      internalNumber: schema.calls.internalNumber,
      totalDuration: sql<number>`COALESCE(SUM(${schema.calls.duration}), 0)::int`,
      totalCalls: sql<number>`COUNT(*)::int`,
      incoming: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('входящий', 'incoming') AND COALESCE(${schema.calls.duration}, 0) > 0)::int`,
      outgoing: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('исходящий', 'outgoing'))::int`,
      missed: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('входящий', 'incoming') AND COALESCE(${schema.calls.duration}, 0) = 0)::int`,
    })
    .from(schema.calls)
    .where(
      and(
        eq(schema.calls.workspaceId, workspaceId),
        gte(schema.calls.timestamp, new Date(dateFrom)),
        lte(schema.calls.timestamp, new Date(dateTo)),
        sql`${schema.calls.internalNumber} IS NOT NULL AND TRIM(${schema.calls.internalNumber}) != ''`,
      ),
    )
    .groupBy(schema.calls.internalNumber);

  return results
    .filter(
      (row) =>
        row.internalNumber != null && String(row.internalNumber).trim() !== "",
    )
    .map((row) => ({
      internalNumber: String(row.internalNumber).trim(),
      totalDurationSeconds: Math.max(0, Number(row.totalDuration) || 0),
      incoming: Math.max(0, Number(row.incoming) || 0),
      outgoing: Math.max(0, Number(row.outgoing) || 0),
      missed: Math.max(0, Number(row.missed) || 0),
      totalCalls: Math.max(0, Number(row.totalCalls) || 0),
    }));
}
