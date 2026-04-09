import { and, avg, count, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { CallStatus } from "../../utils/call-status";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";
import { parseDateToUTC } from "./date-utils";

/**
 * Helper to parse date string or throw a descriptive error
 */
function parseDateOrThrow(dateStr: string, fieldName: string): Date {
  try {
    return parseDateToUTC(dateStr);
  } catch (error) {
    throw new Error(
      `Неверный формат даты ${fieldName}: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
    );
  }
}

interface GetCallsMetricsParams {
  workspaceId?: string;
  excludePhoneNumbers?: string[];
  dateFrom?: string;
  dateTo?: string;
  mobileNumbers?: string[];
  directions?: ("inbound" | "outbound")[];
  managerPhoneNumbers?: string[];
  statuses?: CallStatus[];
  managerPhoneNumbersForQuery?: string[];
  q?: string;
  includeArchived?: boolean;
  onlyArchived?: boolean;
}

export async function getCallsMetrics(params?: GetCallsMetricsParams): Promise<{
  totalCalls: number;
  transcribed: number;
  avgDuration: number;
  lastSync: string | null;
}> {
  const {
    workspaceId,
    excludePhoneNumbers,
    dateFrom,
    dateTo,
    mobileNumbers,
    directions,
    managerPhoneNumbers,
    statuses,
    managerPhoneNumbersForQuery,
    q,
    includeArchived,
    onlyArchived,
  } = params || {};

  const conditions = [];

  // Логика фильтрации по архивным звонкам
  if (onlyArchived) {
    conditions.push(eq(schema.calls.isArchived, true));
  } else if (!includeArchived) {
    // По умолчанию исключаем архивные звонки
    conditions.push(eq(schema.calls.isArchived, false));
  }

  if (workspaceId != null) {
    conditions.push(eq(schema.calls.workspaceId, workspaceId));
  }

  if (dateFrom) {
    const parsedDateFrom = parseDateOrThrow(dateFrom, "dateFrom");
    conditions.push(gte(schema.calls.timestamp, parsedDateFrom));
  }

  if (dateTo) {
    const parsedDateTo = parseDateOrThrow(dateTo, "dateTo");
    // Создаем следующий день в UTC midnight
    const nextDayMidnight = new Date(
      Date.UTC(
        parsedDateTo.getUTCFullYear(),
        parsedDateTo.getUTCMonth(),
        parsedDateTo.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
    conditions.push(lt(schema.calls.timestamp, nextDayMidnight));
  }

  if (mobileNumbers?.length) {
    conditions.push(or(...mobileNumbers.map((num) => eq(schema.calls.number, num))));
  }

  if (directions?.length) {
    conditions.push(or(...directions.map((dir) => eq(schema.calls.direction, dir))));
  }

  // Убираем valueScore так как этого поля нет в схеме
  // if (valueScores?.length) {
  //   conditions.push(
  //     or(
  //       ...valueScores.map(score => eq(schema.calls.valueScore, score))
  //     )
  //   );
  // }

  if (managerPhoneNumbers?.length) {
    conditions.push(or(...managerPhoneNumbers.map((num) => eq(schema.calls.number, num))));
  }

  if (statuses?.length) {
    conditions.push(or(...statuses.map((status) => eq(schema.calls.status, status))));
  }

  if (managerPhoneNumbersForQuery?.length) {
    conditions.push(or(...managerPhoneNumbersForQuery.map((num) => eq(schema.calls.number, num))));
  }

  if (q) {
    conditions.push(or(ilike(schema.calls.name, `%${q}%`), ilike(schema.calls.number, `%${q}%`)));
  }

  const excludeCondition = excludePhoneNumbers?.length
    ? buildExcludePhoneCondition(excludePhoneNumbers, schema.calls)
    : undefined;

  const allConditions = [...conditions, excludeCondition].filter(Boolean);

  const totalCallsQuery = db.select({ count: count() }).from(schema.calls).$dynamic();
  const transcribedQuery = db
    .select({ count: count() })
    .from(schema.transcripts)
    .innerJoin(schema.calls, eq(schema.transcripts.callId, schema.calls.id))
    .$dynamic();
  const avgDurationQuery = db
    .select({ avg: avg(schema.files.durationSeconds) })
    .from(schema.calls)
    .leftJoin(schema.files, eq(schema.calls.fileId, schema.files.id))
    .$dynamic();
  const lastSyncQuery =
    workspaceId != null
      ? db
          .select({ timestamp: schema.activityLog.timestamp })
          .from(schema.activityLog)
          .where(eq(schema.activityLog.workspaceId, workspaceId))
          .orderBy(desc(schema.activityLog.timestamp))
          .limit(1)
      : db
          .select({ timestamp: schema.activityLog.timestamp })
          .from(schema.activityLog)
          .orderBy(desc(schema.activityLog.timestamp))
          .limit(1);

  const [totalCallsResult, transcribedResult, avgDurationResult, lastSyncResult] =
    await Promise.all([
      allConditions.length > 0 ? totalCallsQuery.where(and(...allConditions)) : totalCallsQuery,
      allConditions.length > 0 ? transcribedQuery.where(and(...allConditions)) : transcribedQuery,
      allConditions.length > 0 ? avgDurationQuery.where(and(...allConditions)) : avgDurationQuery,
      lastSyncQuery,
    ]);

  const totalCalls = totalCallsResult[0]?.count ?? 0;
  const transcribed = transcribedResult[0]?.count ?? 0;
  const avgDuration = Math.round(Number(avgDurationResult[0]?.avg ?? 0));
  const lastSync = lastSyncResult[0]?.timestamp ?? null;

  return {
    totalCalls,
    transcribed,
    avgDuration,
    lastSync: lastSync ? lastSync.toISOString() : null,
  };
}
