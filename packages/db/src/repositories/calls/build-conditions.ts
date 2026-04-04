import { eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import * as schema from "../../schema";
import { ANSWERED_ALIASES, MISSED_ALIASES } from "../../utils/call-status";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";

export interface CallConditionsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  mobileNumbers?: string[];
  /** Номера телефонов, исключённые из выборки (внутренние или внешние) */
  excludePhoneNumbers?: string[];
  directions?: string[];
  valueScores?: number[];
  managerInternalNumbers?: string[];
  statuses?: string[];
  managerInternalNumbersForQuery?: string[];
  q?: string;
  /** Включить архивированные звонки (по умолчанию false - только неархивированные) */
  includeArchived?: boolean;
  /** Только архивированные звонки (по умолчанию false) */
  onlyArchived?: boolean;
}

export function buildCallConditions({
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
  managerInternalNumbersForQuery,
  q,
  includeArchived,
  onlyArchived,
}: CallConditionsParams) {
  const conditions = [];

  // Управление архивными звонками: onlyArchived > includeArchived > default (неархивированные)
  if (onlyArchived) {
    conditions.push(eq(schema.calls.isArchived, true));
  } else if (includeArchived) {
    // Не добавляем фильтр по архивации - включаем все звонки
  } else {
    // По умолчанию - только неархивированные
    conditions.push(eq(schema.calls.isArchived, false));
  }

  if (workspaceId != null) {
    conditions.push(eq(schema.calls.workspaceId, workspaceId));
  }
  if (dateFrom) {
    conditions.push(gte(schema.calls.timestamp, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(schema.calls.timestamp, new Date(dateTo)));
  }
  if (internalNumbers !== undefined && mobileNumbers !== undefined) {
    const hasInternal = internalNumbers.length > 0;
    const hasMobile = mobileNumbers.length > 0;
    if (hasInternal && hasMobile) {
      const orCond = or(
        inArray(schema.calls.internalNumber, internalNumbers),
        inArray(schema.calls.number, mobileNumbers),
      );
      if (orCond) conditions.push(orCond);
    } else if (hasInternal) {
      conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
    } else if (hasMobile) {
      conditions.push(inArray(schema.calls.number, mobileNumbers));
    } else {
      // Оба пусты — участник без идентификаторов, не показываем звонки
      conditions.push(sql`false`);
    }
  } else if (internalNumbers?.length) {
    conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
  } else if (mobileNumbers?.length) {
    conditions.push(inArray(schema.calls.number, mobileNumbers));
  }
  if (directions?.length) {
    // Normalize directions first to avoid pushing empty strings (e.g. from whitespace-only input)
    const normalizedDirections = directions
      .map((direction) => direction.trim().toLowerCase())
      .filter((d) => d.length > 0);

    // Validate direction values - throw error for invalid values
    const invalidDirections = normalizedDirections.filter(
      (d) => d !== "inbound" && d !== "outbound",
    );
    if (invalidDirections.length > 0) {
      throw new Error(
        `Неверные значения направления: ${invalidDirections.join(", ")}. Допустимые значения: inbound, outbound`,
      );
    }

    // Only add SQL predicate when we actually have valid direction values
    if (normalizedDirections.length > 0) {
      conditions.push(
        inArray(
          sql<string>`LOWER(COALESCE(${schema.calls.direction}, 'unknown'))`,
          normalizedDirections,
        ),
      );
    }
  }
  if (statuses?.length) {
    const normalizedStatuses = statuses
      .map((status) => status.trim().toLowerCase())
      .filter((status) => status.length > 0);
    if (normalizedStatuses.length > 0) {
      const statusValue = sql<string>`LOWER(COALESCE(${schema.calls.status}, 'unknown'))`;
      const missedAliasesSql = sql.join(
        MISSED_ALIASES.map((alias) => sql`${alias}`),
        sql`, `,
      );
      const answeredAliasesSql = sql.join(
        ANSWERED_ALIASES.map((alias) => sql`${alias}`),
        sql`, `,
      );
      const canonicalStatus = sql<string>`
        CASE
          WHEN ${statusValue} IN (${missedAliasesSql}) THEN 'missed'
          WHEN ${statusValue} IN (${answeredAliasesSql}) THEN 'answered'
          ELSE ${statusValue}
        END
      `;
      conditions.push(inArray(canonicalStatus, normalizedStatuses));
    }
  }
  // Фильтрация по менеджерам идет через internal_number -> phone_number
  // managerInternalNumbers содержит phone_numbers из workspace_pbx_numbers
  if (managerInternalNumbers?.length) {
    conditions.push(inArray(schema.calls.internalNumber, managerInternalNumbers));
  }
  if (valueScores?.length) {
    conditions.push(inArray(schema.callEvaluations.valueScore, valueScores));
  }
  if (q) {
    const qCond = or(
      ilike(schema.calls.number, `%${q}%`),
      ilike(schema.calls.name, `%${q}%`),
      ilike(schema.calls.customerName, `%${q}%`),
      ilike(schema.calls.internalNumber, `%${q}%`),
      managerInternalNumbersForQuery?.length
        ? inArray(schema.calls.internalNumber, managerInternalNumbersForQuery)
        : undefined,
    );
    if (qCond) conditions.push(qCond);
  }

  if (excludePhoneNumbers?.length) {
    const excludeCondition = buildExcludePhoneCondition(excludePhoneNumbers, schema.calls);
    if (excludeCondition) {
      conditions.push(excludeCondition);
    }
  }

  return conditions;
}
