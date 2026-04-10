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
): ReturnType<typeof desc> | ReturnType<typeof asc> | ReturnType<typeof sql<unknown>> {
  const order = sortOrder === "asc" ? asc : desc;
  const nullsClause = sortOrder === "asc" ? "NULLS LAST" : "NULLS FIRST";

  switch (sortBy) {
    case "direction":
      return order(schema.calls.direction);
    case "number":
      return order(schema.calls.number);
    case "name":
      return order(schema.calls.name);
    case "value_score":
      // Для сортировки по value_score используем явное указание NULLS для детерминированности
      return sql`${schema.callEvaluations.valueScore} ${sql.raw(sortOrder === "asc" ? "ASC" : "DESC")} ${sql.raw(nullsClause)}`;
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
      managerPhoneNumbers,
      managerPhoneNumbersForQuery,
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
      managerPhoneNumbers,
      managerPhoneNumbersForQuery,
      mobileNumbers,
      q,
      statuses,
      valueScores,
      workspaceId,
      excludePhoneNumbers,
    });

    const orderByClause = buildOrderBy(sortBy, sortOrder);

    const query = db
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

    const result = await query;

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
      mobileNumbers: params.mobileNumbers,
      excludePhoneNumbers: params.excludePhoneNumbers,
      directions: params.directions,
      valueScores: params.valueScores,
      managerPhoneNumbers: params.managerPhoneNumbers,
      statuses: params.statuses,
      managerPhoneNumbersForQuery: params.managerPhoneNumbersForQuery,
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
      managerPhoneNumbers,
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
      mobileNumbers,
      excludePhoneNumbers,
      directions,
      valueScores,
      managerPhoneNumbers,
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
