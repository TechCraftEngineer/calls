import { and, isNull, notInArray, or } from "drizzle-orm";
import type * as schema from "../../schema";

type CallsTable = typeof schema.calls;

/**
 * Условие для исключения звонков по списку телефонов (internalNumber и number).
 */
export function buildExcludePhoneCondition(
  excludePhoneNumbers: string[] | undefined,
  calls: CallsTable,
) {
  if (!excludePhoneNumbers?.length) return undefined;
  return and(
    or(
      isNull(calls.internalNumber),
      notInArray(calls.internalNumber, excludePhoneNumbers),
    ),
    or(isNull(calls.number), notInArray(calls.number, excludePhoneNumbers)),
  );
}
