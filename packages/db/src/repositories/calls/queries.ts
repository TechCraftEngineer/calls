/**
 * Query operations for calls - search, filtering, and aggregation
 */

import { and, asc, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { CallWithTranscript, GetCallsParams, GetCallManagersParams } from "../../types/calls.types";
import { buildCallConditions } from "./build-conditions";

export const callsQueries = {
  async findWithTranscriptsAndEvaluations(
    params: GetCallsParams = {},
  ): Promise<CallWithTranscript[]> {
    const {
      limit = 50,
      offset = 0,
      dateFrom,
      dateTo,
      directions,
      internalNumbers,
      managers,
      managerInternalNumbers,
      managerInternalNumbersForQuery,
      mobileNumbers,
      operators,
      q,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    } = params;

    // Явно требуем workspaceId для безопасности
    if (!workspaceId) {
      throw new Error('workspaceId обязателен для findWithTranscriptsAndEvaluations');
    }

    const conditions = buildCallConditions({
      dateFrom,
      dateTo,
      directions,
      internalNumbers,
      managers,
      managerInternalNumbers,
      managerInternalNumbersForQuery,
      mobileNumbers,
      operators,
      q,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    });

    const result = await db
      .select({
        call: schema.calls,
        transcript: schema.transcripts,
        evaluation: schema.callEvaluations,
        fileDuration: schema.files.durationSeconds,
        fileSizeBytes: schema.files.sizeBytes,
      })
      .from(schema.calls)
      .leftJoin(
        schema.transcripts,
        eq(schema.transcripts.callId, schema.calls.id),
      )
      .leftJoin(
        schema.callEvaluations,
        eq(schema.callEvaluations.callId, schema.calls.id),
      )
      .leftJoin(schema.files, eq(schema.files.id, schema.calls.fileId))
      .where(and(...conditions))
      .orderBy(desc(schema.calls.timestamp))
      .limit(limit)
      .offset(offset);

    return result.map((row) => ({
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
    // Явно требуем workspaceId для безопасности
    if (!params.workspaceId) {
      throw new Error('workspaceId обязателен для countCalls');
    }

    const conditions = buildCallConditions({
      workspaceId: params.workspaceId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      internalNumbers: params.internalNumbers,
      mobileNumbers: params.mobileNumbers,
      excludePhoneNumbers: params.excludePhoneNumbers,
      directions: params.directions,
      valueScores: params.valueScores,
      operators: params.operators,
      managers: params.managers,
      managerInternalNumbers: params.managerInternalNumbers,
      statuses: params.statuses,
      managerInternalNumbersForQuery: params.managerInternalNumbersForQuery,
      q: params.q,
    });

    const result = await db
      .select({ count: count() })
      .from(schema.calls)
      .leftJoin(
        schema.callEvaluations,
        eq(schema.callEvaluations.callId, schema.calls.id),
      )
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  },

  async findDistinctManagers(
    params: GetCallManagersParams = {},
  ): Promise<string[]> {
    const {
      dateFrom,
      dateTo,
      directions,
      internalNumbers,
      managers,
      managerInternalNumbers,
      mobileNumbers,
      operators,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    } = params;

    // Явно требуем workspaceId для безопасности
    if (!workspaceId) {
      throw new Error('workspaceId обязателен для findDistinctManagers');
    }

    const conditions = buildCallConditions({
      dateFrom,
      dateTo,
      directions,
      internalNumbers,
      managers,
      managerInternalNumbers,
      mobileNumbers,
      operators,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    });

    const result = await db
      .select({ name: schema.calls.name })
      .from(schema.calls)
      .leftJoin(
        schema.callEvaluations,
        eq(schema.callEvaluations.callId, schema.calls.id),
      )
      .where(conditions.length > 0 ? and(...conditions, isNotNull(schema.calls.name)) : isNotNull(schema.calls.name))
      .groupBy(schema.calls.name)
      .orderBy(asc(schema.calls.name));

    return result
      .map((row) => row.name)
      .filter((name): name is string => Boolean(name));
  },
};
