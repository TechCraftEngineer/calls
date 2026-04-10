import { eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import * as schema from "../../schema";
import { ANSWERED_ALIASES, MISSED_ALIASES, TECHNICAL_ERROR_ALIASES } from "../../utils/call-status";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";

export interface CallConditionsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  mobileNumbers?: string[];
  /** Номера телефонов, исключённые из выборки (внутренние или внешние) */
  excludePhoneNumbers?: string[];
  directions?: string[];
  valueScores?: number[];
  managerPhoneNumbers?: string[];
  statuses?: string[];
  managerPhoneNumbersForQuery?: string[];
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
  mobileNumbers,
  excludePhoneNumbers,
  directions,
  valueScores,
  managerPhoneNumbers,
  statuses,
  managerPhoneNumbersForQuery,
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
  if (mobileNumbers !== undefined) {
    if (mobileNumbers.length > 0) {
      conditions.push(inArray(schema.calls.internalNumber, mobileNumbers));
    } else {
      // Пустой массив — участник без идентификаторов, не показываем звонки
      conditions.push(sql`false`);
    }
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
        inArray(sql<string>`LOWER(${schema.calls.direction}::text)`, normalizedDirections),
      );
    }
  }
  if (statuses?.length) {
    const normalizedStatuses = statuses
      .map((status) => status.trim().toLowerCase())
      .filter((status) => status.length > 0);
    if (normalizedStatuses.length > 0) {
      const statusValue = sql<string>`LOWER(${schema.calls.status}::text)`;
      const missedAliasesSql = sql.join(
        MISSED_ALIASES.map((alias) => sql`${alias}`),
        sql`, `,
      );
      const answeredAliasesSql = sql.join(
        ANSWERED_ALIASES.map((alias) => sql`${alias}`),
        sql`, `,
      );
      const technicalErrorAliasesSql = sql.join(
        TECHNICAL_ERROR_ALIASES.map((alias) => sql`${alias}`),
        sql`, `,
      );
      const canonicalStatus = sql<string>`
        CASE
          WHEN ${statusValue} IN (${missedAliasesSql}) THEN 'missed'
          WHEN ${statusValue} IN (${answeredAliasesSql}) THEN 'answered'
          WHEN ${statusValue} IN (${technicalErrorAliasesSql}) THEN 'technical_error'
          ELSE ${statusValue}
        END
      `;
      conditions.push(inArray(canonicalStatus, normalizedStatuses));
    }
  }
  // Фильтрация по менеджерам идет через phone_number
  // managerPhoneNumbers содержит phone_numbers из workspace_pbx_numbers
  if (managerPhoneNumbers?.length) {
    conditions.push(inArray(schema.calls.number, managerPhoneNumbers));
  }
  if (valueScores?.length) {
    const hasZero = valueScores.includes(0);
    const nonZeroScores = valueScores.filter((s) => s !== 0);

    if (hasZero && nonZeroScores.length === 0) {
      // Только 0 - ищем null или 0 (неоцененные + нулевая ценность)
      const zeroCondition = or(
        isNull(schema.callEvaluations.valueScore),
        eq(schema.callEvaluations.valueScore, 0),
      );
      if (zeroCondition) conditions.push(zeroCondition);
    } else if (hasZero) {
      // 0 и другие значения - ищем null, 0, или любое из выбранных ненулевых значений
      const mixedCondition = or(
        isNull(schema.callEvaluations.valueScore),
        eq(schema.callEvaluations.valueScore, 0),
        inArray(schema.callEvaluations.valueScore, nonZeroScores),
      );
      if (mixedCondition) conditions.push(mixedCondition);
    } else {
      // Только ненулевые значения
      conditions.push(inArray(schema.callEvaluations.valueScore, valueScores));
    }
  }
  if (q) {
    const qCond = or(
      ilike(schema.calls.number, `%${q}%`),
      ilike(schema.calls.name, `%${q}%`),
      ilike(schema.calls.customerName, `%${q}%`),
      managerPhoneNumbersForQuery?.length
        ? inArray(schema.calls.number, managerPhoneNumbersForQuery)
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
