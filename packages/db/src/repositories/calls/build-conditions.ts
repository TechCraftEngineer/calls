import { and, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import * as schema from "../../schema";

export interface CallConditionsParams {
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  mobileNumbers?: string[];
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
  if (internalNumbers?.length) {
    conditions.push(inArray(schema.calls.internalNumber, internalNumbers));
  }
  if (mobileNumbers?.length) {
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

  return conditions;
}
