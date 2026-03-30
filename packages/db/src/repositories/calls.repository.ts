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
import { normalizeCallStatus } from "../utils/call-status";
import { buildCallConditions } from "./calls/build-conditions";
import {
  getCallSummariesByManager as getCallSummariesByManagerFn,
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

  async findByExternalId(
    workspaceId: string,
    provider: string,
    externalId: string,
  ): Promise<schema.Call | null> {
    const result = await db
      .select()
      .from(schema.calls)
      .where(
        and(
          eq(schema.calls.workspaceId, workspaceId),
          eq(schema.calls.provider, provider),
          eq(schema.calls.externalId, externalId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async findLatestByPhone(
    workspaceId: string,
    phone: string,
  ): Promise<{
    customerName: string | null;
    internalNumber: string | null;
    name: string | null;
  } | null> {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone) return null;

    const query = db
      .select({
        customerName: schema.calls.customerName,
        internalNumber: schema.calls.internalNumber,
        name: schema.calls.name,
      })
      .from(schema.calls)
      .where(
        and(
          eq(schema.calls.workspaceId, workspaceId),
          sql<boolean>`(
            ${schema.calls.number} = ${normalizedPhone}
            OR ${schema.calls.number} LIKE ${`%${normalizedPhone}`}
            OR ${normalizedPhone} LIKE ('%' || ${schema.calls.number})
          )`,
        ),
      )
      .orderBy(desc(schema.calls.timestamp), desc(schema.calls.id))
      .limit(1);

    const row = (await query)[0];
    return row ?? null;
  },

  async createWithResult(
    data: CreateCallData,
  ): Promise<{ id: string; created: boolean }> {
    const status = normalizeCallStatus(data.status) ?? null;
    const values = {
      workspaceId: data.workspaceId,
      filename: data.filename,
      provider: data.provider ?? null,
      externalId: data.externalId ?? null,
      number: data.number ?? null,
      timestamp: new Date(data.timestamp),
      name: data.name ?? null,
      direction: data.direction ?? null,
      status,
      fileId: data.fileId ?? null,
      pbxNumberId: data.pbxNumberId ?? null,
      internalNumber: data.internalNumber ?? null,
      source: data.source ?? null,
      customerName: data.customerName ?? null,
    };

    const result =
      data.provider && data.externalId
        ? await db
            .insert(schema.calls)
            .values(values)
            .onConflictDoNothing({
              target: [
                schema.calls.workspaceId,
                schema.calls.provider,
                schema.calls.externalId,
              ],
            })
            .returning({ id: schema.calls.id })
        : await db
            .insert(schema.calls)
            .values(values)
            .onConflictDoNothing({
              target: [schema.calls.workspaceId, schema.calls.filename],
            })
            .returning({ id: schema.calls.id });

    if (result[0]?.id) {
      return { id: result[0].id, created: true };
    }

    if (data.provider && data.externalId) {
      const existing = await this.findByExternalId(
        data.workspaceId,
        data.provider,
        data.externalId,
      );
      if (existing?.id) {
        return { id: existing.id, created: false };
      }
      throw new Error(
        `Call create failed: insert returned no id and no existing call found by external id (workspaceId=${data.workspaceId}, provider=${data.provider}, externalId=${data.externalId})`,
      );
    }

    const existing = await this.findByFilename(data.filename, data.workspaceId);
    if (existing?.id) {
      return { id: existing.id, created: false };
    }
    throw new Error(
      `Call create failed: insert returned no id and no existing call found by filename (workspaceId=${data.workspaceId}, filename=${data.filename})`,
    );
  },

  async create(data: CreateCallData): Promise<string> {
    const created = await this.createWithResult(data);
    return created.id;
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

  async updateRecording(
    callId: string,
    data: { fileId: string | null },
  ): Promise<void> {
    await db
      .update(schema.calls)
      .set({
        fileId: data.fileId,
        updatedAt: new Date(),
      })
      .where(eq(schema.calls.id, callId));
  },

  async updateEnhancedAudio(
    callId: string,
    enhancedAudioFileId: string | null,
  ): Promise<void> {
    await db
      .update(schema.calls)
      .set({
        enhancedAudioFileId,
        updatedAt: new Date(),
      })
      .where(eq(schema.calls.id, callId));
  },

  async updatePbxBinding(
    callId: string,
    data: {
      pbxNumberId?: string | null;
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
    },
  ): Promise<void> {
    const patch: {
      pbxNumberId?: string | null;
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
      updatedAt?: Date;
    } = {};

    if (data.pbxNumberId !== undefined) patch.pbxNumberId = data.pbxNumberId;
    if (data.internalNumber !== undefined)
      patch.internalNumber = data.internalNumber;
    if (data.source !== undefined) patch.source = data.source;
    if (data.name !== undefined) patch.name = data.name;

    if (Object.keys(patch).length === 0) return;
    patch.updatedAt = new Date();
    await db.update(schema.calls).set(patch).where(eq(schema.calls.id, callId));
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
      managerInternalNumbers,
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
      managerInternalNumbers,
      statuses,
      managerInternalNumbersForQuery,
      q,
    });

    const query = db
      .select({
        call: schema.calls,
        transcript: schema.transcripts,
        evaluation: schema.callEvaluations,
        fileDuration: schema.files.durationSeconds,
        fileSizeBytes: schema.files.sizeBytes,
      })
      .from(schema.calls)
      .leftJoin(schema.files, eq(schema.calls.fileId, schema.files.id))
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
      fileDuration: row.fileDuration,
      fileSizeBytes: row.fileSizeBytes,
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
      managerInternalNumbers,
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
      managerInternalNumbers,
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
    callType?: string | null;
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
      callType: data.callType ?? null,
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

  async getCallSummariesByManager(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
    limitPerManager?: number;
  }) {
    return getCallSummariesByManagerFn(params);
  },

  async getKpiStats(params: {
    workspaceId: string;
    dateFrom: string;
    dateTo: string;
    excludePhoneNumbers?: string[];
  }) {
    return getKpiStatsFn(params);
  },

  async enrichStatsWithKpi(
    stats: Record<string, any>,
    workspaceId: string,
  ): Promise<Record<string, any>> {
    // Получаем KPI данные сотрудников
    const employees = await db
      .select({
        internalNumber: schema.workspacePbxEmployees.extension,
        kpiBaseSalary: schema.workspacePbxEmployees.kpiBaseSalary,
        kpiTargetBonus: schema.workspacePbxEmployees.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: schema.workspacePbxEmployees.kpiTargetTalkTimeMinutes,
      })
      .from(schema.workspacePbxEmployees)
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, workspaceId),
          eq(schema.workspacePbxEmployees.isActive, true),
        ),
      );

    console.log('KPI Employees from DB:', employees);
    console.log('Stats to enrich:', Object.entries(stats).map(([name, stat]) => ({ name, internalNumber: stat.internalNumber })));

    // Создаем映射 internalNumber -> KPI данные и имя -> KPI данные
    const kpiMapByNumber = new Map();
    const kpiMapByName = new Map();
    for (const emp of employees) {
      if (emp.internalNumber) {
        const cleanNumber = String(emp.internalNumber).trim();
        kpiMapByNumber.set(cleanNumber, {
          kpiBaseSalary: emp.kpiBaseSalary,
          kpiTargetBonus: emp.kpiTargetBonus,
          kpiTargetTalkTimeMinutes: emp.kpiTargetTalkTimeMinutes,
        });
      }
    }

    console.log('KPI Map by number created:', Array.from(kpiMapByNumber.entries()));

    // Обогащаем статистику KPI данными
    const enrichedStats: Record<string, any> = {};
    for (const [name, stat] of Object.entries(stats)) {
      const cleanInternalNumber = stat.internalNumber ? String(stat.internalNumber).trim() : null;
      let kpiData = cleanInternalNumber ? kpiMapByNumber.get(cleanInternalNumber) : null;
      
      console.log(`Processing manager: ${name}, internalNumber: ${cleanInternalNumber}, kpiData:`, kpiData);
      
      // Вычисляем KPI метрики
      const totalMinutes = Math.round(
        ((stat.incoming?.totalDuration ?? 0) + (stat.outgoing?.totalDuration ?? 0)) / 60
      );
      
      const targetTalkTimeMinutes = kpiData?.kpiTargetTalkTimeMinutes ?? 0;
      const completionPercentage = targetTalkTimeMinutes > 0 
        ? Math.min(100, Math.round((totalMinutes / targetTalkTimeMinutes) * 100))
        : 0;
      
      const calculatedBonus = targetTalkTimeMinutes > 0 && completionPercentage > 0
        ? Math.round((kpiData?.kpiTargetBonus ?? 0) * (completionPercentage / 100))
        : 0;
      
      const totalSalary = (kpiData?.kpiBaseSalary ?? 0) + calculatedBonus;

      enrichedStats[name] = {
        ...stat,
        kpiBaseSalary: kpiData?.kpiBaseSalary,
        kpiTargetBonus: kpiData?.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: targetTalkTimeMinutes,
        kpiActualTalkTimeMinutes: totalMinutes,
        kpiCompletionPercentage: completionPercentage,
        kpiCalculatedBonus: calculatedBonus,
        kpiTotalSalary: totalSalary,
      };
    }

    console.log('Enriched stats:', enrichedStats);
    return enrichedStats;
  },
};

export type CallsRepository = typeof callsRepository;
