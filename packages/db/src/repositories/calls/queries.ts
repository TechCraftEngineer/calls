/**
 * Query operations for calls - search, filtering, and aggregation
 */

import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type {
  CallWithTranscript,
  GetCallManagersParams,
  GetCallsParams,
} from "../../types/calls.types";
import { buildCallConditions } from "./build-conditions";

/**
 * Строит ORDER BY выражение для динамической сортировки звонков
 */
function buildOrderBy(
  sortBy: GetCallsParams["sortBy"],
  sortOrder: GetCallsParams["sortOrder"],
): ReturnType<typeof desc> | ReturnType<typeof asc> | ReturnType<typeof sql> {
  const order = sortOrder === "asc" ? asc : desc;

  switch (sortBy) {
    case "direction":
      return order(schema.calls.direction);
    case "number":
      return order(schema.calls.number);
    case "name":
      return order(schema.calls.name);
    case "value_score":
      // Для сортировки по value_score используем поле из evaluation
      return order(schema.callEvaluations.valueScore);
    case "timestamp":
    default:
      return order(schema.calls.timestamp);
  }
}

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
      managerInternalNumbers,
      managerInternalNumbersForQuery,
      mobileNumbers,
      q,
      statuses,
      valueScores,
      workspaceId,
      sortBy,
      sortOrder,
      excludePhoneNumbers,
    } = params;

    // Явно требуем workspaceId для безопасности
    if (!workspaceId) {
      throw new Error("workspaceId обязателен для findWithTranscriptsAndEvaluations");
    }

    const conditions = buildCallConditions({
      dateFrom,
      dateTo,
      directions,
      internalNumbers,
      managerInternalNumbers,
      managerInternalNumbersForQuery,
      mobileNumbers,
      q,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    });

    const orderByClause = buildOrderBy(sortBy, sortOrder);

    const result = await db
      .select({
        call: schema.calls,
        transcript: schema.transcripts,
        evaluation: schema.callEvaluations,
        fileDuration: schema.files.durationSeconds,
        fileSizeBytes: schema.files.sizeBytes,
      })
      .from(schema.calls)
      .leftJoin(schema.transcripts, eq(schema.transcripts.callId, schema.calls.id))
      .leftJoin(schema.callEvaluations, eq(schema.callEvaluations.callId, schema.calls.id))
      .leftJoin(schema.files, eq(schema.files.id, schema.calls.fileId))
      .where(and(...conditions))
      .orderBy(orderByClause)
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

  async countCalls(params: Omit<GetCallsParams, "limit" | "offset"> = {}): Promise<number> {
    // Явно требуем workspaceId для безопасности
    if (!params.workspaceId) {
      throw new Error("workspaceId обязателен для countCalls");
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
      managerInternalNumbers: params.managerInternalNumbers,
      statuses: params.statuses,
      managerInternalNumbersForQuery: params.managerInternalNumbersForQuery,
      q: params.q,
    });

    // Добавляем LEFT JOIN только когда нужны фильтры по valueScores
    const baseQuery = db.select({ count: count() }).from(schema.calls);

    const queryWithJoins = params.valueScores?.length
      ? baseQuery.leftJoin(
          schema.callEvaluations,
          eq(schema.callEvaluations.callId, schema.calls.id),
        )
      : baseQuery;

    const result = await queryWithJoins.where(and(...conditions));

    return result[0]?.count ?? 0;
  },

  async findDistinctManagers(params: GetCallManagersParams = {}): Promise<string[]> {
    const {
      dateFrom,
      dateTo,
      directions,
      internalNumbers,
      managerInternalNumbers,
      mobileNumbers,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    } = params;

    // Явно требуем workspaceId для безопасности
    if (!workspaceId) {
      throw new Error("workspaceId обязателен для findDistinctManagers");
    }

    const conditions = buildCallConditions({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      managerInternalNumbers,
      statuses,
    });

    // Добавляем LEFT JOIN только когда нужны фильтры по valueScores
    const baseQuery = db.select({ name: schema.calls.name }).from(schema.calls);

    const queryWithJoins = valueScores?.length
      ? baseQuery.leftJoin(
          schema.callEvaluations,
          eq(schema.callEvaluations.callId, schema.calls.id),
        )
      : baseQuery;

    const result = await queryWithJoins
      .where(
        conditions.length > 0
          ? and(...conditions, isNotNull(schema.calls.name))
          : isNotNull(schema.calls.name),
      )
      .groupBy(schema.calls.name)
      .orderBy(asc(schema.calls.name));

    return result.map((row) => row.name).filter((name): name is string => Boolean(name));
  },
};
