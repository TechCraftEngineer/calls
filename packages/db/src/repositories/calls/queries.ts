/**
 * Query operations for calls - search, filtering, and aggregation
 */

import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
    const {
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
      .select({ count: count() })
      .from(schema.calls)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

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
      .where(and(...conditions, isNotNull(schema.calls.name)))
      .groupBy(schema.calls.name)
      .orderBy(asc(schema.calls.name));

    return result
      .map((row) => row.name)
      .filter((name): name is string => Boolean(name));
  },
};
