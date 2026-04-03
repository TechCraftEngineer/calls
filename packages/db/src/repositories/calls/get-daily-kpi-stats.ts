import { and, eq, gte, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";

export interface GetDailyKpiStatsInput {
  workspaceId: string;
  employeeExternalId: string;
  dateFrom: string; // 'YYYY-MM-DD HH:MM:SS'
  dateTo: string; // 'YYYY-MM-DD HH:MM:SS'
  excludePhoneNumbers?: string[];
}

export interface DailyKpiStat {
  date: string; // 'YYYY-MM-DD'
  totalDurationSeconds: number;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
}

/**
 * Возвращает статистику звонков по дням для конкретного сотрудника.
 * Использует half-open period семантику [startDate, endDate).
 * Группирует данные по дням с учетом таймзоны (по умолчанию UTC).
 * duration берётся из files.durationSeconds.
 */
export async function getDailyKpiStats(input: GetDailyKpiStatsInput): Promise<DailyKpiStat[]> {
  const { workspaceId, employeeExternalId, dateFrom, dateTo, excludePhoneNumbers } = input;

  // Получаем номера телефонов сотрудника по external_id
  const phoneNumbers = await db
    .select({ phoneNumber: schema.workspacePbxNumbers.phoneNumber })
    .from(schema.workspacePbxNumbers)
    .where(
      and(
        eq(schema.workspacePbxNumbers.workspaceId, workspaceId),
        eq(schema.workspacePbxNumbers.employeeExternalId, employeeExternalId),
        eq(schema.workspacePbxNumbers.isActive, true),
      ),
    );

  if (!phoneNumbers.length) {
    return [];
  }

  const internalNumbers = phoneNumbers
    .map((row) => row.phoneNumber)
    .filter((num): num is string => num != null && num.trim() !== "");

  // Вычисляем nextDay(endDate) для half-open period семантики
  const dateToExclusive = new Date(dateTo);
  dateToExclusive.setDate(dateToExclusive.getDate() + 1);

  const conditions = [
    eq(schema.calls.workspaceId, workspaceId),
    sql`${schema.calls.internalNumber} = ANY(${internalNumbers})`,
    gte(schema.calls.timestamp, new Date(dateFrom)),
    lt(schema.calls.timestamp, dateToExclusive),
  ];

  if (excludePhoneNumbers?.length) {
    const excludeCondition = and(
      or(isNull(schema.calls.number), notInArray(schema.calls.number, excludePhoneNumbers)),
    );
    if (excludeCondition) {
      conditions.push(excludeCondition);
    }
  }

  const results = await db
    .select({
      date: sql<string>`DATE(${schema.calls.timestamp} AT TIME ZONE 'UTC')`,
      totalDuration: sql<number>`COALESCE(SUM(${schema.files.durationSeconds}), 0)::int`,
      totalCalls: sql<number>`COUNT(*)::int`,
      incoming: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('inbound', 'incoming') AND COALESCE(${schema.files.durationSeconds}, 0) > 0)::int`,
      outgoing: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('outbound', 'outgoing'))::int`,
      missed: sql<number>`COUNT(*) FILTER (WHERE LOWER(COALESCE(${schema.calls.direction}, '')) IN ('inbound', 'incoming') AND COALESCE(${schema.files.durationSeconds}, 0) = 0)::int`,
    })
    .from(schema.calls)
    .leftJoin(schema.files, eq(schema.calls.fileId, schema.files.id))
    .leftJoin(schema.callEvaluations, eq(schema.calls.id, schema.callEvaluations.callId))
    // Исключаем звонки, отмеченные как автоответчик/неанализируемые
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
    .groupBy(sql`DATE(${schema.calls.timestamp} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${schema.calls.timestamp} AT TIME ZONE 'UTC') ASC`);

  return results.map((row) => ({
    date: row.date,
    totalDurationSeconds: Math.max(0, Number(row.totalDuration) || 0),
    totalCalls: Math.max(0, Number(row.totalCalls) || 0),
    incoming: Math.max(0, Number(row.incoming) || 0),
    outgoing: Math.max(0, Number(row.outgoing) || 0),
    missed: Math.max(0, Number(row.missed) || 0),
  }));
}
