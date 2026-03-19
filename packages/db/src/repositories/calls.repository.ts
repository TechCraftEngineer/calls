/**
 * Calls repository - handles all database operations for calls
 */

import { and, asc, count, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type {
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
  GetCallManagersParams,
  GetCallsParams,
} from "../types/calls.types";
import { buildCallConditions } from "./calls/build-conditions";
import { computeCallStatus } from "./calls/compute-call-status";
import {
  getEvaluationsStats as getEvaluationsStatsFn,
  getLowRatedCallsCount as getLowRatedCallsCountFn,
} from "./calls/get-evaluations-stats";
import { getKpiStats as getKpiStatsFn } from "./calls/get-kpi-stats";
import { getCallsMetrics } from "./calls/get-metrics";

export const callsRepository = {
  async findById(id: string): Promise<schema.Call | null> {
    const result = await db
      .select()
      .from(schema.calls)
      .where(eq(schema.calls.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(schema.calls).where(eq(schema.calls.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async findByFilename(
    filename: string,
    workspaceId?: string,
  ): Promise<schema.Call | null> {
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
  },

  async create(data: CreateCallData): Promise<string> {
    const status =
      data.status ?? computeCallStatus(data.duration, data.direction);
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
        status,
        sizeBytes: data.sizeBytes ?? null,
        fileId: data.fileId ?? null,
        pbxNumberId: data.pbxNumberId ?? null,
        internalNumber: data.internalNumber ?? null,
        source: data.source ?? null,
        customerName: data.customerName ?? null,
      })
      .returning({ id: schema.calls.id });
    return result[0]?.id ?? "";
  },

  async updateDuration(callId: string, durationSeconds: number): Promise<void> {
    const call = await this.findById(callId);
    const newDuration = Math.round(durationSeconds);
    const status = call ? computeCallStatus(newDuration, call.direction) : null;
    await db
      .update(schema.calls)
      .set({ duration: newDuration, ...(status != null && { status }) })
      .where(eq(schema.calls.id, callId));
  },

  async updateCustomerName(
    callId: string,
    customerName: string | null,
  ): Promise<void> {
    await db
      .update(schema.calls)
      .set({ customerName })
      .where(eq(schema.calls.id, callId));
  },

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
      excludePhoneNumbers,
      directions,
      valueScores,
      operators,
      managers,
      statuses,
      managerInternalNumbersForQuery,
      q,
    } = params;

    const conditions = buildCallConditions({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      operators,
      managers,
      statuses,
      managerInternalNumbersForQuery,
      q,
    });

    const query = db
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
      .offset(offset)
      .$dynamic();

    const results =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return results.map((row) => ({
      call: row.call,
      transcript: row.transcript,
      evaluation: row.evaluation,
    }));
  },

  async countCalls(
    params: Omit<GetCallsParams, "limit" | "offset"> = {},
  ): Promise<number> {
    const {
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      operators,
      managers,
      statuses,
      managerInternalNumbersForQuery,
      q,
    } = params;

    const conditions = buildCallConditions({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      operators,
      managers,
      statuses,
      managerInternalNumbersForQuery,
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
          .$dynamic()
      : db.select({ count: count() }).from(schema.calls).$dynamic();

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;
    return result[0]?.count ?? 0;
  },

  async findDistinctManagers(
    params: GetCallManagersParams = {},
  ): Promise<string[]> {
    const {
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      operators,
      statuses,
    } = params;

    const conditions = buildCallConditions({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      operators,
      statuses,
    });

    conditions.push(isNotNull(schema.calls.name));
    conditions.push(ne(schema.calls.name, ""));

    const trimmedName = sql<string>`trim(${schema.calls.name})`;

    const query = db
      .selectDistinct({ name: trimmedName })
      .from(schema.calls)
      .leftJoin(
        schema.callEvaluations,
        eq(schema.calls.id, schema.callEvaluations.callId),
      )
      .orderBy(asc(trimmedName))
      .$dynamic();

    const result =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return result
      .map((item) => item.name?.trim())
      .filter((name): name is string => Boolean(name));
  },

  async getTranscriptByCallId(
    callId: string,
  ): Promise<schema.Transcript | null> {
    const result = await db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.callId, callId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsertTranscript(data: {
    callId: string;
    text?: string | null;
    rawText?: string | null;
    title?: string | null;
    sentiment?: string | null;
    confidence?: number | null;
    summary?: string | null;
    callTopic?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<string> {
    const values = {
      text: data.text ?? null,
      rawText: data.rawText ?? null,
      title: data.title ?? null,
      sentiment: data.sentiment ?? null,
      confidence: data.confidence ?? null,
      summary: data.summary ?? null,
      callTopic: data.callTopic ?? null,
      metadata: data.metadata ?? null,
    };

    const result = await db
      .insert(schema.transcripts)
      .values({
        callId: data.callId,
        ...values,
      })
      .onConflictDoUpdate({
        target: schema.transcripts.callId,
        set: values,
      })
      .returning({ id: schema.transcripts.id });

    return result[0]?.id ?? "";
  },

  async getEvaluation(callId: string): Promise<schema.CallEvaluation | null> {
    const result = await db
      .select()
      .from(schema.callEvaluations)
      .where(eq(schema.callEvaluations.callId, callId))
      .limit(1);
    return result[0] ?? null;
  },

  async addEvaluation(data: EvaluationData): Promise<string> {
    // Используем транзакцию для атомарности операции
    return await db.transaction(async (tx) => {
      // Проверяем существование звонка
      const existingCall = await tx
        .select({ id: schema.calls.id })
        .from(schema.calls)
        .where(eq(schema.calls.id, data.callId))
        .limit(1);

      if (!existingCall[0]) {
        throw new Error(`Call with ID ${data.callId} not found`);
      }

      const breakdown =
        typeof data.managerBreakdown === "object"
          ? data.managerBreakdown
          : null;
      const recommendations = Array.isArray(data.managerRecommendations)
        ? data.managerRecommendations
        : null;

      const result = await tx
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
    });
  },

  async getMetrics(workspaceId?: string, excludePhoneNumbers?: string[]) {
    return getCallsMetrics(workspaceId, excludePhoneNumbers);
  },

  async getEvaluationsStats(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
  }) {
    return getEvaluationsStatsFn(params);
  },

  async getLowRatedCallsCount(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
    maxScore?: number;
  }) {
    return getLowRatedCallsCountFn(params);
  },

  async getKpiStats(params: {
    workspaceId: string;
    dateFrom: string;
    dateTo: string;
    excludePhoneNumbers?: string[];
  }) {
    return getKpiStatsFn(params);
  },
};

export type CallsRepository = typeof callsRepository;
