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
    workspaceId?: string,
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

  async create(data: CreateCallData): Promise<string> {
    const result = await db
      .insert(schema.calls)
      .values({
        workspaceId: data.workspaceId,
        filename: data.filename,
        number: data.number ?? null,
        timestamp: new Date(data.timestamp),
        name: data.name ?? null,
        duration: data.duration ?? null,
        direction: data.direction ?? null,
        status: data.status ?? null,
        sizeBytes: data.sizeBytes ?? null,
        internalNumber: data.internalNumber ?? null,
        source: data.source ?? null,
        customerName: data.customerName ?? null,
      })
      .returning({ id: schema.calls.id });
    return result[0]?.id ?? "";
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

    const conditions = this.buildCallConditions({
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
        eq(schema.calls.id, schema.transcripts.callId),
      )
      .leftJoin(
        schema.callEvaluations,
        eq(schema.calls.id, schema.callEvaluations.callId),
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

    const conditions = this.buildCallConditions({
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
            eq(schema.calls.id, schema.callEvaluations.callId),
          )
      : db.select({ count: count() }).from(schema.calls);

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;
    return result[0]?.count ?? 0;
  }

  async getTranscriptByCallId(callId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.callId, callId))
      .limit(1);
    return result[0] ?? null;
  }

  async upsertTranscript(data: {
    callId: string;
    text?: string | null;
    rawText?: string | null;
    title?: string | null;
    sentiment?: string | null;
    confidence?: number | null;
    summary?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<string> {
    const existing = await db
      .select({ id: schema.transcripts.id })
      .from(schema.transcripts)
      .where(eq(schema.transcripts.callId, data.callId))
      .limit(1);

    const values = {
      text: data.text ?? null,
      rawText: data.rawText ?? null,
      title: data.title ?? null,
      sentiment: data.sentiment ?? null,
      confidence: data.confidence ?? null,
      summary: data.summary ?? null,
      metadata: data.metadata ?? null,
    };

    if (existing[0]) {
      await db
        .update(schema.transcripts)
        .set(values)
        .where(eq(schema.transcripts.id, existing[0].id));
      return existing[0].id;
    }

    const result = await db
      .insert(schema.transcripts)
      .values({
        callId: data.callId,
        ...values,
      })
      .returning({ id: schema.transcripts.id });
    return result[0]?.id ?? "";
  }

  async getEvaluation(callId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(schema.callEvaluations)
      .where(eq(schema.callEvaluations.callId, callId))
      .limit(1);
    return result[0] ?? null;
  }

  async addEvaluation(data: EvaluationData): Promise<string> {
    // Проверяем существование звонка
    const existingCall = await db
      .select({ id: schema.calls.id })
      .from(schema.calls)
      .where(eq(schema.calls.id, data.callId))
      .limit(1);

    if (!existingCall[0]) {
      throw new Error(`Call with ID ${data.callId} not found`);
    }

    const breakdown =
      typeof data.managerBreakdown === "object" ? data.managerBreakdown : null;
    const recommendations = Array.isArray(data.managerRecommendations)
      ? data.managerRecommendations
      : null;

    const result = await db
      .insert(schema.callEvaluations)
      .values({
        callId: data.callId,
        isQualityAnalyzable: data.isQualityAnalyzable !== false,
        notAnalyzableReason: data.notAnalyzableReason ?? null,
        valueScore: data.valueScore ?? null,
        valueExplanation: data.valueExplanation ?? null,
        managerScore: data.managerScore ?? null,
        managerFeedback: data.managerFeedback ?? null,
        managerBreakdown: breakdown,
        managerRecommendations: recommendations,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.callEvaluations.callId,
        set: {
          isQualityAnalyzable: data.isQualityAnalyzable !== false,
          notAnalyzableReason: data.notAnalyzableReason ?? null,
          valueScore: data.valueScore ?? null,
          valueExplanation: data.valueExplanation ?? null,
          managerScore: data.managerScore ?? null,
          managerFeedback: data.managerFeedback ?? null,
          managerBreakdown: breakdown,
          managerRecommendations: recommendations,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.callEvaluations.id });

    return result[0]?.id ?? "";
  }

  async getMetrics(workspaceId?: string): Promise<{
    totalCalls: number;
    transcribed: number;
    avgDuration: number;
    lastSync: string | null;
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
              eq(schema.transcripts.callId, schema.calls.id),
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
      totalCalls: totalCalls,
      transcribed,
      avgDuration: avgDuration,
      lastSync: lastSync ? lastSync.toISOString() : null,
    };
  }

  async getEvaluationsStats(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
  }): Promise<
    Record<
      string,
      {
        name: string;
        internalNumber: string | null;
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
    if (dateFrom)
      conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
    }

    let query = db
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
      );

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;
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

  private buildCallConditions(params: {
    workspaceId?: string;
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
      conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
    }
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
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
      conditions.push(inArray(schema.callEvaluations.valueScore, valueScores));
    }
    if (q) {
      const qCond = or(
        like(schema.calls.number, `%${q}%`),
        like(schema.calls.name, `%${q}%`),
        like(schema.calls.customerName, `%${q}%`),
      );
      if (qCond) conditions.push(qCond);
    }

    return conditions;
  }
}
