import { eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import * as schema from "../../schema";
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
  operators?: string[];
  managers?: string[];
  managerInternalNumbers?: string[];
  statuses?: string[];
  managerInternalNumbersForQuery?: string[];
  q?: string;
}

export function buildCallConditions(params: CallConditionsParams) {
  const conditions = [];
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
    const expandedDirections = [
      ...new Set(
        directions.flatMap((direction) => {
          const d = direction.trim().toLowerCase();
          if (d === "входящий" || d === "incoming" || d === "inbound") {
            return ["входящий", "incoming", "inbound"];
          }
          if (d === "исходящий" || d === "outgoing" || d === "outbound") {
            return ["исходящий", "outgoing", "outbound"];
          }
          return [d];
        }),
      ),
    ];
    conditions.push(
      inArray(
        sql<string>`LOWER(COALESCE(${schema.calls.direction}, ''))`,
        expandedDirections,
      ),
    );
  }
  if (statuses?.length) {
    conditions.push(inArray(schema.calls.status, statuses));
  }
  if (operators?.length) {
    conditions.push(inArray(schema.calls.source, operators));
  }
  if (managers?.length) {
    conditions.push(inArray(schema.calls.name, managers));
  }
  if (managerInternalNumbers?.length) {
    conditions.push(
      inArray(schema.calls.internalNumber, managerInternalNumbers),
    );
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
    const excludeCondition = buildExcludePhoneCondition(
      excludePhoneNumbers,
      schema.calls,
    );
    if (excludeCondition) {
      conditions.push(excludeCondition);
    }
  }

  return conditions;
}
