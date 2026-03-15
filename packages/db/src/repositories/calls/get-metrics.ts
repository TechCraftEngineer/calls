import { and, avg, count, desc, eq } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";

export async function getCallsMetrics(workspaceId?: string): Promise<{
  totalCalls: number;
  transcribed: number;
  avgDuration: number;
  lastSync: string | null;
}> {
  const callConditions =
    workspaceId != null
      ? [eq(schema.calls.workspaceId, workspaceId)]
      : undefined;

  const totalCallsQuery = db
    .select({ count: count() })
    .from(schema.calls)
    .$dynamic();
  const transcribedQuery = db
    .select({ count: count() })
    .from(schema.transcripts)
    .innerJoin(schema.calls, eq(schema.transcripts.callId, schema.calls.id))
    .$dynamic();
  const avgDurationQuery = db
    .select({ avg: avg(schema.calls.duration) })
    .from(schema.calls)
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

  const [
    totalCallsResult,
    transcribedResult,
    avgDurationResult,
    lastSyncResult,
  ] = await Promise.all([
    callConditions
      ? totalCallsQuery.where(and(...callConditions))
      : totalCallsQuery,
    callConditions
      ? transcribedQuery.where(and(...callConditions))
      : transcribedQuery,
    callConditions
      ? avgDurationQuery.where(and(...callConditions))
      : avgDurationQuery,
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
