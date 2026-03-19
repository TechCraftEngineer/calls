import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import * as schema from "../../schema";

export interface CallConditionsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  mobileNumbers?: string[];
  /** Номера телефонов, исключённые из выборки (внутренние или внешние) */
  excludePhoneNumbers?: string[];
  direction?: string;
  valueScores?: number[];
  operators?: string[];
  manager?: string;
  status?: string;
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

  if (excludePhoneNumbers?.length) {
    const excludeCondition = and(
      or(
        isNull(schema.calls.internalNumber),
        notInArray(schema.calls.internalNumber, excludePhoneNumbers),
      ),
      or(
        isNull(schema.calls.number),
        notInArray(schema.calls.number, excludePhoneNumbers),
      ),
    );
    if (excludeCondition) {
      conditions.push(excludeCondition);
    }
  }

  return conditions;
}
