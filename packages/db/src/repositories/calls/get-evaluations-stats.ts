import { and, avg, count, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";

export interface GetEvaluationsStatsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
}

export async function getEvaluationsStats(
  params: GetEvaluationsStatsParams,
): Promise<
  Record<
    string,
    {
      name: string;
      internalNumber: string | null;
      incoming: { count: number; duration: number };
      outgoing: { count: number; duration: number };
    }
  >
> {
  const { workspaceId, dateFrom, dateTo, internalNumbers } = params;

  const conditions = [];
  if (workspaceId != null)
    conditions.push(eq(schema.calls.workspaceId, workspaceId));
  if (dateFrom)
    conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  if (internalNumbers?.length) {
    conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
  }

  const query = db
    .select({
      internalNumber: schema.calls.internalNumber,
      managerName: schema.calls.name,
      direction: schema.calls.direction,
      totalCalls: count(),
      totalDuration: avg(schema.calls.duration),
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

  const stats: Record<
    string,
    {
      name: string;
      internalNumber: string | null;
      incoming: { count: number; duration: number };
      outgoing: { count: number; duration: number };
    }
  > = {};

  for (const row of results) {
    const key = row.managerName ?? row.internalNumber ?? "Unknown";
    if (!stats[key]) {
      stats[key] = {
        name: key,
        internalNumber: row.internalNumber,
        incoming: { count: 0, duration: 0 },
        outgoing: { count: 0, duration: 0 },
      };
    }

    const dir = String(row.direction ?? "").toLowerCase();
    const target =
      dir === "входящий" || dir === "incoming"
        ? stats[key].incoming
        : stats[key].outgoing;

    target.count += Number(row.totalCalls ?? 0);
    target.duration += Number(row.totalDuration ?? 0);
  }

  return stats;
}
