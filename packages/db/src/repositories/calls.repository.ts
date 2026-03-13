/**
 * Calls repository - handles all database operations for calls
 */

import {
  and,
  avg,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
} from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type {
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
  GetCallsParams,
} from "../types/calls.types";
import { BaseRepository } from "./base.repository";

export class CallsRepository extends BaseRepository<typeof schema.calls> {
  constructor() {
    super(schema.calls);
  }

  async findByFilename(
    filename: string,
    workspaceId?: number,
  ): Promise<any | null> {
    const conditions = [eq(schema.calls.filename, filename)];
    if (workspaceId != null) {
      conditions.push(eq(schema.calls.workspaceId, workspaceId));
    }
    const result = await db
      .select()
      .from(schema.calls)
      .where(and(...conditions))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: CreateCallData): Promise<number> {
    const result = await db
      .insert(schema.calls)
      .values({
        workspaceId: data.workspaceId,
        filename: data.filename,
        number: data.number ?? null,
        timestamp: data.timestamp,
        name: data.name ?? null,
        duration: data.duration ?? null,
        direction: data.direction ?? null,
        status: data.status ?? null,
        size_bytes: data.size_bytes ?? null,
        internal_number: data.internal_number ?? null,
        source: data.source ?? null,
        customer_name: data.customer_name ?? null,
      })
      .returning({ id: schema.calls.id });
    return result[0]?.id ?? 0;
  }

  async findWithTranscriptsAndEvaluations(
    params: GetCallsParams = {},
  ): Promise<CallWithTranscript[]> {
    const {
      workspaceId,
      limit = 100,
      offset = 0,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    } = params;

    const conditions = this._buildCallConditions({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    });

    let query = db
      .select({
        call: schema.calls,
        transcript: schema.transcripts,
        evaluation: schema.callEvaluations,
      })
      .from(schema.calls)
      .leftJoin(
        schema.transcripts,
        eq(schema.calls.id, schema.transcripts.call_id),
      )
      .leftJoin(
        schema.callEvaluations,
        eq(schema.calls.id, schema.callEvaluations.call_id),
      )
      .orderBy(desc(schema.calls.timestamp), desc(schema.calls.id))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;

    return results.map((row) => ({
      call: row.call,
      transcript: row.transcript,
      evaluation: row.evaluation,
    }));
  }

  async countCalls(
    params: Omit<GetCallsParams, "limit" | "offset"> = {},
  ): Promise<number> {
    const {
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    } = params;

    const conditions = this._buildCallConditions({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    });

    const baseQuery = valueScores?.length
      ? db
          .select({ count: count() })
          .from(schema.calls)
          .innerJoin(
            schema.callEvaluations,
            eq(schema.calls.id, schema.callEvaluations.call_id),
          )
      : db.select({ count: count() }).from(schema.calls);

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;
    return result[0]?.count ?? 0;
  }

  async getTranscriptByCallId(callId: number): Promise<any | null> {
    const result = await db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.call_id, callId))
      .limit(1);
    return result[0] ?? null;
  }

  async getEvaluation(callId: number): Promise<any | null> {
    const result = await db
      .select()
      .from(schema.callEvaluations)
      .where(eq(schema.callEvaluations.call_id, callId))
      .limit(1);
    return result[0] ?? null;
  }

  async addEvaluation(data: EvaluationData): Promise<number> {
    const breakdown =
      typeof data.manager_breakdown === "object"
        ? JSON.stringify(data.manager_breakdown)
        : (data.manager_breakdown ?? null);
    const recommendations = Array.isArray(data.manager_recommendations)
      ? JSON.stringify(data.manager_recommendations)
      : null;

    const result = await db
      .insert(schema.callEvaluations)
      .values({
        call_id: data.call_id,
        is_quality_analyzable: data.is_quality_analyzable !== false,
        not_analyzable_reason: data.not_analyzable_reason ?? null,
        value_score: data.value_score ?? null,
        value_explanation: data.value_explanation ?? null,
        manager_score: data.manager_score ?? null,
        manager_feedback: data.manager_feedback ?? null,
        manager_breakdown: breakdown,
        manager_recommendations: recommendations,
        created_at: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.callEvaluations.call_id,
        set: {
          is_quality_analyzable: data.is_quality_analyzable !== false,
          not_analyzable_reason: data.not_analyzable_reason ?? null,
          value_score: data.value_score ?? null,
          value_explanation: data.value_explanation ?? null,
          manager_score: data.manager_score ?? null,
          manager_feedback: data.manager_feedback ?? null,
          manager_breakdown: breakdown,
          manager_recommendations: recommendations,
          created_at: new Date().toISOString(),
        },
      })
      .returning({ id: schema.callEvaluations.id });

    return result[0]?.id ?? 0;
  }

  async getMetrics(workspaceId?: number): Promise<{
    total_calls: number;
    transcribed: number;
    avg_duration: number;
    last_sync: string | null;
  }> {
    const callConditions =
      workspaceId != null
        ? [eq(schema.calls.workspaceId, workspaceId)]
        : undefined;
    const [
      totalCallsResult,
      transcribedResult,
      avgDurationResult,
      lastSyncResult,
    ] = await Promise.all([
      callConditions
        ? db
            .select({ count: count() })
            .from(schema.calls)
            .where(and(...callConditions))
        : db.select({ count: count() }).from(schema.calls),
      callConditions
        ? db
            .select({ count: count() })
            .from(schema.transcripts)
            .innerJoin(
              schema.calls,
              eq(schema.transcripts.call_id, schema.calls.id),
            )
            .where(and(...callConditions))
        : db.select({ count: count() }).from(schema.transcripts),
      callConditions
        ? db
            .select({ avg: avg(schema.calls.duration) })
            .from(schema.calls)
            .where(and(...callConditions))
        : db.select({ avg: avg(schema.calls.duration) }).from(schema.calls),
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
            .limit(1),
    ]);

    const totalCalls = totalCallsResult[0]?.count ?? 0;
    const transcribed = transcribedResult[0]?.count ?? 0;
    const avgDuration = Math.round(Number(avgDurationResult[0]?.avg ?? 0));
    const lastSync = lastSyncResult[0]?.timestamp ?? null;

    return {
      total_calls: totalCalls,
      transcribed,
      avg_duration: avgDuration,
      last_sync: lastSync,
    };
  }

  async getEvaluationsStats(params: {
    workspaceId?: number;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
  }): Promise<
    Record<
      string,
      {
        name: string;
        internal_number: string | null;
        incoming: { count: number; duration: number };
        outgoing: { count: number; duration: number };
        score_distribution?: Record<
          number,
          { count: number; duration: number }
        >;
      }
    >
  > {
    const { workspaceId, dateFrom, dateTo, internalNumbers } = params;

    const conditions = [];
    if (workspaceId != null)
      conditions.push(eq(schema.calls.workspaceId, workspaceId));
    if (dateFrom) conditions.push(gte(schema.calls.timestamp, dateFrom));
    if (dateTo) conditions.push(lte(schema.calls.timestamp, dateTo));
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internal_number, internalNumbers));
    }

    let query = db
      .select({
        internal_number: schema.calls.internal_number,
        manager_name: schema.calls.name,
        direction: schema.calls.direction,
        total_calls: count(),
        total_duration: avg(schema.calls.duration),
      })
      .from(schema.calls)
      .leftJoin(
        schema.callEvaluations,
        eq(schema.calls.id, schema.callEvaluations.call_id),
      )
      .groupBy(
        schema.calls.internal_number,
        schema.calls.name,
        schema.calls.direction,
      );

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;
    const stats: Record<
      string,
      {
        name: string;
        internal_number: string | null;
        incoming: { count: number; duration: number };
        outgoing: { count: number; duration: number };
      }
    > = {};

    for (const row of results) {
      const key = row.manager_name ?? row.internal_number ?? "Unknown";
      if (!stats[key]) {
        stats[key] = {
          name: key,
          internal_number: row.internal_number,
          incoming: { count: 0, duration: 0 },
          outgoing: { count: 0, duration: 0 },
        };
      }

      const dir = String(row.direction ?? "").toLowerCase();
      const target =
        dir === "входящий" || dir === "incoming"
          ? stats[key].incoming
          : stats[key].outgoing;

      target.count += Number(row.total_calls ?? 0);
      target.duration += Number(row.total_duration ?? 0);
    }

    return stats;
  }

  private _buildCallConditions(params: {
    workspaceId?: number;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    mobileNumbers?: string[];
    direction?: string;
    valueScores?: number[];
    operators?: string[];
    manager?: string;
    status?: string;
    q?: string;
  }) {
    const conditions = [];
    const {
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    } = params;

    if (workspaceId != null) {
      conditions.push(eq(schema.calls.workspaceId, workspaceId));
    }
    if (dateFrom) {
      conditions.push(gte(schema.calls.timestamp, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(schema.calls.timestamp, dateTo));
    }
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internal_number, internalNumbers));
    }
    if (mobileNumbers?.length) {
      conditions.push(inArray(schema.calls.number, mobileNumbers));
    }
    if (direction) {
      conditions.push(eq(schema.calls.direction, direction));
    }
    if (status) {
      conditions.push(eq(schema.calls.status, status));
    }
    if (operators?.length) {
      conditions.push(inArray(schema.calls.source, operators));
    }
    if (manager) {
      conditions.push(eq(schema.calls.name, manager));
    }
    if (valueScores?.length) {
      conditions.push(inArray(schema.callEvaluations.value_score, valueScores));
    }
    if (q) {
      const qCond = or(
        like(schema.calls.number, `%${q}%`),
        like(schema.calls.name, `%${q}%`),
        like(schema.calls.customer_name, `%${q}%`),
      );
      if (qCond) conditions.push(qCond);
    }

    return conditions;
  }
}
