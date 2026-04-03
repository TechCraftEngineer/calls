import { and, avg, count, desc, eq, gte, lt, ilike, or } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";

interface GetCallsMetricsParams {
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
}

export async function getCallsMetrics(
  params?: GetCallsMetricsParams,
): Promise<{
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
    internalNumbers,
    mobileNumbers,
    directions,
    managerInternalNumbers,
    statuses,
    managerInternalNumbersForQuery,
    q,
  } = params || {};

  const conditions = [];
  
  if (workspaceId != null) {
    conditions.push(eq(schema.calls.workspaceId, workspaceId));
  }

  if (dateFrom) {
    conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  }

  if (dateTo) {
    // Используем half-open interval: [dateFrom, nextDay(dateTo))
    // Это включает весь день dateTo
    const endDate = new Date(dateTo);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    conditions.push(lt(schema.calls.timestamp, endDate));
  }

  if (internalNumbers?.length) {
    conditions.push(
      or(
        ...internalNumbers.map(num => eq(schema.calls.internalNumber, num))
      )
    );
  }

  if (mobileNumbers?.length) {
    conditions.push(
      or(
        ...mobileNumbers.map(num => eq(schema.calls.number, num))
      )
    );
  }

  if (directions?.length) {
    conditions.push(
      or(
        ...directions.map(dir => eq(schema.calls.direction, dir))
      )
    );
  }

  // Убираем valueScore так как этого поля нет в схеме
  // if (valueScores?.length) {
  //   conditions.push(
  //     or(
  //       ...valueScores.map(score => eq(schema.calls.valueScore, score))
  //     )
  //   );
  // }

  if (managerInternalNumbers?.length) {
    conditions.push(
      or(
        ...managerInternalNumbers.map(num => eq(schema.calls.internalNumber, num))
      )
    );
  }

  if (statuses?.length) {
    conditions.push(
      or(
        ...statuses.map(status => eq(schema.calls.status, status))
      )
    );
  }

  if (managerInternalNumbersForQuery?.length) {
    conditions.push(
      or(
        ...managerInternalNumbersForQuery.map(num => eq(schema.calls.internalNumber, num))
      )
    );
  }

  if (q) {
    conditions.push(
      or(
        ilike(schema.calls.name, `%${q}%`),
        ilike(schema.calls.number, `%${q}%`),
        ilike(schema.calls.internalNumber, `%${q}%`)
      )
    );
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
