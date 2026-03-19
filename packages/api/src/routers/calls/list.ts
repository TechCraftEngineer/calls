import {
  type CallWithTranscript,
  pbxRepository,
  settingsService,
} from "@calls/db";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { calculateAnalysisCostRub } from "./analysis-cost";
import { getInternalNumbersForUser, getMobileNumbersForUser } from "./utils";

const transcriptMetadataSchema = z
  .object({ operatorName: z.string().optional() })
  .passthrough();
const PBX_PROVIDER = "megapbx";

const maybeStringOrArraySchema = z
  .union([z.string(), z.array(z.string())])
  .optional();

function toStringArray(input: string | string[] | undefined): string[] {
  if (typeof input === "string") {
    const value = input.trim();
    return value ? [value] : [];
  }
  if (Array.isArray(input)) {
    return input.map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

const listCallsSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(15),
  q: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  direction: maybeStringOrArraySchema,
  manager: maybeStringOrArraySchema,
  status: maybeStringOrArraySchema,
  value: z.array(z.number()).optional(),
  operator: z.array(z.string()).optional(),
});

export const list = workspaceProcedure
  .input(listCallsSchema)
  .handler(async ({ input, context }) => {
    const { callsService, user, workspaceId } = context;
    const offset = (input.page - 1) * input.per_page;
    const directionFilters = toStringArray(input.direction);
    const managerFilters = toStringArray(input.manager);
    const statusFilters = toStringArray(input.status);

    const dateFrom = input.date_from
      ? `${input.date_from}T00:00:00`
      : undefined;
    const dateTo = input.date_to ? `${input.date_to}T23:59:59` : undefined;
    const normalizedStatuses = statusFilters
      ?.map((status) =>
        status === "missed" || status === "Пропущен"
          ? "ПРОПУЩЕН"
          : status === "answered" || status === "Принят"
            ? "ПРИНЯТ"
            : null,
      )
      .filter((status): status is "ПРОПУЩЕН" | "ПРИНЯТ" => status !== null);

    const normalizedDirections = directionFilters
      ?.map((direction) =>
        direction === "incoming" || direction === "Входящий"
          ? "Входящий"
          : direction === "outgoing" || direction === "Исходящий"
            ? "Исходящий"
            : null,
      )
      .filter(
        (direction): direction is "Входящий" | "Исходящий" =>
          direction !== null,
      );
    const trimmedQuery = input.q?.trim() || undefined;

    const [pbxEmployees, pbxNumbers] = await Promise.all([
      pbxRepository.listEmployees(workspaceId, PBX_PROVIDER),
      pbxRepository.listNumbers(workspaceId, PBX_PROVIDER),
    ]);

    const employeeByExternalId = new Map(
      pbxEmployees.map((employee) => [employee.externalId, employee]),
    );
    const managerNameByInternalNumber = new Map<string, string>();
    for (const number of pbxNumbers) {
      const ext = number.extension?.trim();
      if (!ext) continue;
      const employee = number.employeeExternalId
        ? employeeByExternalId.get(number.employeeExternalId)
        : null;
      const managerName =
        employee?.displayName?.trim() ||
        number.label?.trim() ||
        employee?.firstName?.trim() ||
        null;
      if (managerName && !managerNameByInternalNumber.has(ext)) {
        managerNameByInternalNumber.set(ext, managerName);
      }
    }

    const managerInternalNumbersForQuery = trimmedQuery
      ? pbxNumbers
          .filter((number) => {
            const employee = number.employeeExternalId
              ? employeeByExternalId.get(number.employeeExternalId)
              : null;
            const haystack = [
              employee?.displayName,
              employee?.firstName,
              employee?.lastName,
              number.label,
              number.extension,
            ]
              .filter((value): value is string => typeof value === "string")
              .join(" ")
              .toLowerCase();
            return haystack.includes(trimmedQuery.toLowerCase());
          })
          .map((number) => number.extension?.trim())
          .filter((value): value is string => Boolean(value))
      : [];

    const isAdminOrOwner =
      context.workspaceRole === "admin" || context.workspaceRole === "owner";
    const internalNumbers = isAdminOrOwner
      ? undefined
      : getInternalNumbersForUser(user);
    const mobileNumbers = isAdminOrOwner
      ? undefined
      : getMobileNumbersForUser(user);

    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];
    // Участник (member) видит только свои звонки — при отсутствии internalExtensions/mobilePhones возвращаем пустой список
    if (context.workspaceRole === "member") {
      const hasIdentifiers =
        (internalNumbers?.length ?? 0) > 0 || (mobileNumbers?.length ?? 0) > 0;
      if (!hasIdentifiers) {
        return {
          calls: [],
          pagination: {
            page: input.page,
            total: 0,
            per_page: input.per_page,
            total_pages: 0,
            has_next: false,
            has_prev: false,
            next_num: input.page + 1,
            prev_num: input.page - 1,
            query: input.q ?? "",
            date_from: input.date_from ?? "",
            date_to: input.date_to ?? "",
            direction: directionFilters,
            status: statusFilters,
            manager: managerFilters,
            value: input.value ?? [],
            operator: input.operator ?? [],
          },
          metrics: {
            total_calls: 0,
            transcribed: 0,
            avg_duration: 0,
            last_sync: null,
          },
          managers: [],
        };
      }
    }

    const rawCalls = await callsService.getCallsWithTranscripts({
      workspaceId,
      limit: input.per_page,
      offset,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers:
        excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
      directions: normalizedDirections?.length
        ? normalizedDirections
        : undefined,
      valueScores: input.value?.length ? input.value : undefined,
      operators: input.operator?.length ? input.operator : undefined,
      managers: managerFilters.length ? managerFilters : undefined,
      statuses: normalizedStatuses?.length ? normalizedStatuses : undefined,
      managerInternalNumbersForQuery:
        managerInternalNumbersForQuery.length > 0
          ? managerInternalNumbersForQuery
          : undefined,
      q: trimmedQuery,
    });

    const totalItems = await callsService.countCalls({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers:
        excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
      directions: normalizedDirections?.length
        ? normalizedDirections
        : undefined,
      valueScores: input.value?.length ? input.value : undefined,
      operators: input.operator?.length ? input.operator : undefined,
      managers: managerFilters.length ? managerFilters : undefined,
      statuses: normalizedStatuses?.length ? normalizedStatuses : undefined,
      managerInternalNumbersForQuery:
        managerInternalNumbersForQuery.length > 0
          ? managerInternalNumbersForQuery
          : undefined,
      q: trimmedQuery,
    });

    const totalPages = Math.ceil(totalItems / input.per_page) || 1;
    const metrics = await callsService.calculateMetrics(
      workspaceId,
      excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
    );
    const managers = await callsService.getDistinctManagers({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      excludePhoneNumbers:
        excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
      directions: normalizedDirections?.length
        ? normalizedDirections
        : undefined,
      valueScores: input.value?.length ? input.value : undefined,
      operators: input.operator?.length ? input.operator : undefined,
      statuses: normalizedStatuses?.length ? normalizedStatuses : undefined,
    });

    const callsWithTranscripts = await Promise.all(
      rawCalls.map(async (item: CallWithTranscript) => {
        const operatorName = (() => {
          const meta = item.transcript?.metadata;
          const parsed = transcriptMetadataSchema.safeParse(meta);
          return parsed.success && typeof parsed.data.operatorName === "string"
            ? parsed.data.operatorName.trim() || null
            : null;
        })();
        const normalizedInternalNumber =
          item.call.internalNumber?.trim() || null;
        const managerFromPbx = normalizedInternalNumber
          ? (managerNameByInternalNumber.get(normalizedInternalNumber) ?? null)
          : null;
        const trimmedName = item.call.name?.trim();
        const normalizedCallName =
          trimmedName === "" ? null : (trimmedName ?? null);
        const managerName =
          managerFromPbx ?? normalizedCallName ?? operatorName ?? null;

        const { filename: _filename, ...publicCall } = item.call;

        const isLlmProcessed = Boolean(
          item.transcript?.summary?.trim() || item.evaluation,
        );

        return {
          ...item,
          call: {
            ...publicCall,
            timestamp:
              item.call.timestamp instanceof Date
                ? item.call.timestamp.toISOString()
                : item.call.timestamp,
            managerName,
            operatorName,
            managerId: null,
          },
          analysisCostRub: isLlmProcessed
            ? calculateAnalysisCostRub(
                typeof item.call.duration === "number" && item.call.duration > 0
                  ? item.call.duration
                  : typeof item.transcript?.metadata?.durationInSeconds ===
                      "number"
                    ? item.transcript.metadata.durationInSeconds
                    : null,
              )
            : null,
        };
      }),
    );

    return {
      calls: callsWithTranscripts,
      pagination: {
        page: input.page,
        total: totalItems,
        per_page: input.per_page,
        total_pages: totalPages,
        has_next: input.page < totalPages,
        has_prev: input.page > 1,
        next_num: input.page + 1,
        prev_num: input.page - 1,
        query: input.q ?? "",
        date_from: input.date_from ?? "",
        date_to: input.date_to ?? "",
        direction: directionFilters,
        status: statusFilters,
        manager: managerFilters,
        value: input.value ?? [],
        operator: input.operator ?? [],
      },
      metrics: {
        total_calls: totalItems,
        transcribed: metrics.transcribed,
        avg_duration: metrics.avgDuration,
        last_sync: metrics.lastSync,
      },
      managers,
    };
  });
