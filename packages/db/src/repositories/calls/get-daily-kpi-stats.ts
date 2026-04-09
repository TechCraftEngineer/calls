import { and, eq, gte, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import { parseDateToUTC } from "./date-utils";

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

  const phoneNums = phoneNumbers
    .map((row) => row.phoneNumber)
    .filter((num): num is string => num != null && num.trim() !== "");

  // Нормализуем даты (заменяем пробел на T если нужно) и парсим
  const normalizedDateFrom = dateFrom.replace(" ", "T");
  const normalizedDateTo = dateTo.replace(" ", "T");

  let dateFromDate: Date;
  let dateToDate: Date;

  try {
    dateFromDate = parseDateToUTC(normalizedDateFrom);
    dateToDate = parseDateToUTC(normalizedDateTo);
  } catch (error) {
    throw new Error(
      `Invalid date format: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Вычисляем nextDay(endDate) для half-open period семантики
  const dateToExclusive = new Date(
    Date.UTC(
      dateToDate.getUTCFullYear(),
      dateToDate.getUTCMonth(),
      dateToDate.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );

  const conditions = [
    eq(schema.calls.workspaceId, workspaceId),
    inArray(schema.calls.number, phoneNums),
    gte(schema.calls.timestamp, dateFromDate),
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
      incoming: sql<number>`COUNT(*) FILTER (WHERE LOWER(${schema.calls.direction}::text) = 'inbound' AND COALESCE(${schema.files.durationSeconds}, 0) > 0)::int`,
      outgoing: sql<number>`COUNT(*) FILTER (WHERE LOWER(${schema.calls.direction}::text) = 'outbound')::int`,
      missed: sql<number>`COUNT(*) FILTER (WHERE LOWER(${schema.calls.direction}::text) = 'inbound' AND COALESCE(${schema.files.durationSeconds}, 0) = 0)::int`,
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
