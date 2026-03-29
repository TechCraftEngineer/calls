import {
  type CallStatus,
  type CallWithTranscript,
  normalizeCallStatus,
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
const directionSchema = z.enum([
  "inbound",
  "outbound",
  "входящий",
  "исходящий",
  "Входящий",
  "Исходящий",
]);
const statusSchema = z.enum([
  "missed",
  "answered",
  "accepted",
  "completed",
  "connected",
  "Пропущен",
  "Принят",
  "пропущен",
  "принят",
  "ПРОПУЩЕН",
  "ПРИНЯТ",
]);
const maybeDirectionOrArraySchema = z
  .union([directionSchema, z.array(directionSchema)])
  .optional();
const maybeStatusOrArraySchema = z
  .union([statusSchema, z.array(statusSchema)])
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

export function normalizeStatusFilter(status: string): CallStatus | null {
  const normalized = normalizeCallStatus(status);
  if (normalized) return normalized;
  return null;
}

export function normalizeDirectionFilter(
  direction: string,
): "inbound" | "outbound" | null {
  const normalized = direction.trim().toLowerCase();
  if (normalized === "inbound" || normalized === "входящий") return "inbound";
  if (normalized === "outbound" || normalized === "исходящий")
    return "outbound";
  return null;
}

type ManagerOption = {
  id: string;
  name: string;
};

const listCallsSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(15),
  q: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  direction: maybeDirectionOrArraySchema,
  manager: maybeStringOrArraySchema,
  status: maybeStatusOrArraySchema,
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
      ?.map(normalizeStatusFilter)
      .filter((status): status is CallStatus => status !== null);

    const normalizedDirections = directionFilters
      ?.map(normalizeDirectionFilter)
      .filter(
        (direction): direction is "inbound" | "outbound" => direction !== null,
      );
    const trimmedQuery = input.q?.trim() || undefined;

    const pbxNumbers = await pbxRepository.listNumbers(
      workspaceId,
      PBX_PROVIDER,
    );
    const activePbxNumbers = pbxNumbers.filter((number) => number.isActive);
    const managerNameByInternalNumber = new Map<string, string>();
    const managerIdByInternalNumber = new Map<string, string>();
    const managerInternalNumbersById = new Map<string, Set<string>>();
    const managerDisplayNameById = new Map<string, string>();
    for (const number of activePbxNumbers) {
      const managerId = number.id?.trim() || null;
      if (!managerId) continue;

      const ext = number.extension?.trim() || null;
      const managerName =
        number.label?.trim() || ext || number.phoneNumber?.trim() || null;

      // Справочник менеджеров строим по pbx_numbers (даже если extension нет)
      if (managerName && !managerDisplayNameById.has(managerId)) {
        managerDisplayNameById.set(managerId, managerName);
      }

      // Для фильтрации/сопоставления звонков нужен internalNumber <-> extension
      if (!ext) continue;
      if (managerName && !managerNameByInternalNumber.has(ext)) {
        managerNameByInternalNumber.set(ext, managerName);
      }
      managerIdByInternalNumber.set(ext, managerId);
      const managerNumbers = managerInternalNumbersById.get(managerId);
      if (managerNumbers) {
        managerNumbers.add(ext);
      } else {
        managerInternalNumbersById.set(managerId, new Set([ext]));
      }
    }

    const managerInternalNumbers = managerFilters.length
      ? Array.from(
          new Set(
            managerFilters.flatMap((managerId) =>
              Array.from(
                managerInternalNumbersById.get(managerId.trim()) ??
                  new Set<string>(),
              ),
            ),
          ),
        )
      : [];

    const managerInternalNumbersForQuery = trimmedQuery
      ? activePbxNumbers
          .filter((number) => {
            const haystack = [
              number.label,
              number.extension,
              number.phoneNumber,
              number.externalId,
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
      managers: undefined,
      managerInternalNumbers:
        managerInternalNumbers.length > 0 ? managerInternalNumbers : undefined,
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
      managers: undefined,
      managerInternalNumbers:
        managerInternalNumbers.length > 0 ? managerInternalNumbers : undefined,
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
    const managers: ManagerOption[] = Array.from(
      managerDisplayNameById.entries(),
    )
      .map(([id, name]) => ({ id, name }))
      .filter((item) => item.name.trim().length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));

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
            managerId: normalizedInternalNumber
              ? (managerIdByInternalNumber.get(normalizedInternalNumber) ??
                null)
              : null,
            duration: item.fileDuration ?? null,
          },
          analysisCostRub: isLlmProcessed
            ? calculateAnalysisCostRub(
                typeof item.fileDuration === "number" && item.fileDuration > 0
                  ? item.fileDuration
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
