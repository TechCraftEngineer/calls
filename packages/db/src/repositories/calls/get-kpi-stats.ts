import { and, eq, gte, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";

export interface GetKpiStatsParams {
  workspaceId: string;
  dateFrom: string;
  dateTo: string;
  excludePhoneNumbers?: string[];
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
  const { workspaceId, dateFrom, dateTo, excludePhoneNumbers } = params;

  const conditions = [
    eq(schema.calls.workspaceId, workspaceId),
    gte(schema.calls.timestamp, new Date(dateFrom)),
    lte(schema.calls.timestamp, new Date(dateTo)),
    sql`${schema.calls.internalNumber} IS NOT NULL AND TRIM(${schema.calls.internalNumber}) != ''`,
  ];
  if (excludePhoneNumbers?.length) {
    const excludeCondition = and(
      or(
        isNull(schema.calls.internalNumber),
        notInArray(schema.calls.internalNumber, excludePhoneNumbers),
      ),
      or(
        isNull(schema.calls.number),
        notInArray(schema.calls.number, excludePhoneNumbers),
      ),
    );
    if (excludeCondition) {
      conditions.push(excludeCondition);
    }
  }
  const results = await db
    .select({
      internalNumber: schema.calls.internalNumber,
      totalDuration: sql<number>`COALESCE(SUM(${schema.calls.duration}), 0)::int`,
      totalCalls: sql<number>`COUNT(*)::int`,
      incoming: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('incoming', 'inbound') AND COALESCE(${schema.calls.duration}, 0) > 0)::int`,
      outgoing: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('outgoing', 'outbound'))::int`,
      missed: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('incoming', 'inbound') AND COALESCE(${schema.calls.duration}, 0) = 0)::int`,
    })
    .from(schema.calls)
    .leftJoin(
      schema.callEvaluations,
      eq(schema.calls.id, schema.callEvaluations.callId),
    )
    // Исключаем звонки, отмеченные как автоответчик/неанализируемые.
    // Звонки без оценки (еще не обработанные) оставляем в KPI.
    .where(
      and(
        ...conditions,
        or(
          isNull(schema.callEvaluations.callId),
          and(
            or(
              isNull(schema.callEvaluations.isQualityAnalyzable),
              eq(schema.callEvaluations.isQualityAnalyzable, true),
            ),
            or(
              isNull(schema.callEvaluations.notAnalyzableReason),
              sql`${schema.callEvaluations.notAnalyzableReason} NOT ILIKE '%autoanswerer%'`,
            ),
          ),
        ),
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
