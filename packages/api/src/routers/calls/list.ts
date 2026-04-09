import {
  type CallStatus,
  type CallWithTranscript,
  normalizeCallStatus,
  pbxRepository,
  settingsService,
  type WorkspacePbxEmployee,
  type WorkspacePbxNumber,
} from "@calls/db";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { translateCallType, translateNotAnalyzableReason } from "./translations";
import { getInternalNumbersForUser, getMobileNumbersForUser } from "./utils";

const transcriptMetadataSchema = z.object({ operatorName: z.string().optional() }).passthrough();
const PBX_PROVIDER = "megapbx";

const maybeStringOrArraySchema = z.union([z.string(), z.array(z.string())]).optional();
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
  "technical_error",
  "voicemail",
  "voice_mail",
  "voice mail",
  "автоответчик",
  "голосовая почта",
  "голос. почта",
  "запись",
  "accepted",
  "completed",
  "connected",
  "Пропущен",
  "Принят",
  "Ошибка",
  "пропущен",
  "принят",
  "ошибка",
  "ПРОПУЩЕН",
  "ПРИНЯТ",
  "ОШИБКА",
]);
const maybeDirectionOrArraySchema = z.union([directionSchema, z.array(directionSchema)]).optional();
const maybeStatusOrArraySchema = z.union([statusSchema, z.array(statusSchema)]).optional();

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

export function normalizeDirectionFilter(direction: string): "inbound" | "outbound" | null {
  const normalized = direction.trim().toLowerCase();
  if (normalized === "inbound" || normalized === "входящий") return "inbound";
  if (normalized === "outbound" || normalized === "исходящий") return "outbound";
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
  sort_by: z.enum(["timestamp", "direction", "number", "name", "value_score"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export const list = workspaceProcedure
  .input(listCallsSchema)
  .handler(async ({ input, context }) => {
    const { callsService, user, workspaceId } = context;

    const offset = (input.page - 1) * input.per_page;
    const directionFilters = toStringArray(input.direction);
    const managerFilters = toStringArray(input.manager);
    const statusFilters = toStringArray(input.status);

    const dateFrom = input.date_from ? `${input.date_from}T00:00:00` : undefined;
    const dateTo = input.date_to ? `${input.date_to}T23:59:59` : undefined;
    const normalizedStatuses = statusFilters
      ?.map(normalizeStatusFilter)
      .filter((status): status is CallStatus => status !== null);

    const normalizedDirections = directionFilters
      ?.map(normalizeDirectionFilter)
      .filter((direction): direction is "inbound" | "outbound" => direction !== null);
    const trimmedQuery = input.q?.trim() || undefined;

    // Получаем PBX сотрудников всегда (для списка менеджеров), а номера только при необходимости
    const needsPbxNumbers = managerFilters.length > 0 || trimmedQuery;
    const [pbxEmployees, pbxNumbers] = await Promise.all([
      pbxRepository.listEmployees(workspaceId, PBX_PROVIDER),
      needsPbxNumbers ? pbxRepository.listNumbers(workspaceId, PBX_PROVIDER) : Promise.resolve([]),
    ]);

    // Создаем карты сотрудников для эффективного поиска
    const employeeByExternalId = new Map<string, WorkspacePbxEmployee>();
    const employeeById = new Map<string, WorkspacePbxEmployee>();
    for (const employee of pbxEmployees) {
      if (employee.isActive) {
        employeeByExternalId.set(employee.externalId, employee);
        employeeById.set(employee.id, employee);
      }
    }

    // Группируем PBX номера по employeeExternalId для эффективного поиска
    const phoneNumbersByEmployeeExternalId = new Map<string, WorkspacePbxNumber[]>();
    for (const number of pbxNumbers) {
      if (number.isActive && number.employeeExternalId) {
        const numbers = phoneNumbersByEmployeeExternalId.get(number.employeeExternalId) || [];
        numbers.push(number);
        phoneNumbersByEmployeeExternalId.set(number.employeeExternalId, numbers);
      }
    }

    // Строим менеджеров из PBX данных и получаем связанные phone_number
    const managerDisplayNameById = new Map<string, string>();
    const managerPhoneNumbers = new Map<string, Set<string>>(); // employeeId -> Set<phone_number>

    for (const employee of pbxEmployees) {
      if (!employee.isActive) continue;

      const employeeId = employee.id;
      const displayName =
        employee.displayName ||
        `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
        `Employee ${employee.externalId}`;

      // Устанавливаем отображаемое имя
      managerDisplayNameById.set(employeeId, displayName);

      // Получаем все PBX номера связанные с этим сотрудником через карту
      const relatedNumbers = phoneNumbersByEmployeeExternalId.get(employee.externalId) || [];

      if (relatedNumbers.length > 0) {
        const phoneNumbers = managerPhoneNumbers.get(employeeId) || new Set<string>();
        for (const number of relatedNumbers) {
          if (number.phoneNumber) {
            phoneNumbers.add(number.phoneNumber);
          }
        }
        managerPhoneNumbers.set(employeeId, phoneNumbers);
      }
    }

    const isAdminOrOwner = context.workspaceRole === "admin" || context.workspaceRole === "owner";

    // Ограничиваем фильтр по менеджерам для обычных пользователей
    const finalManagerFilters = isAdminOrOwner
      ? managerFilters
      : managerFilters.length > 0
        ? managerFilters.filter((managerId) => {
            // Для обычного пользователя разрешаем только его собственные manager ID
            // Manager ID для пользователя - это его user ID
            return managerId === user.id;
          })
        : [];

    // Получаем phone_numbers для фильтрации по менеджерам
    const managerInternalNumbers = finalManagerFilters.length
      ? Array.from(
          new Set(
            finalManagerFilters.flatMap((managerId) => {
              const phoneNumbers = managerPhoneNumbers.get(managerId.trim());
              return phoneNumbers ? Array.from(phoneNumbers) : [];
            }),
          ),
        )
      : [];

    // Для поиска по текстовому запросу используем phone_numbers связанных сотрудников
    const managerInternalNumbersForQuery = trimmedQuery
      ? Array.from(
          new Set(
            Array.from(managerPhoneNumbers.entries())
              .filter(([employeeId, _phoneNumbers]) => {
                const employee = employeeById.get(employeeId);
                if (!employee) return false;

                const haystack = [
                  employee.displayName,
                  employee.firstName,
                  employee.lastName,
                  employee.email,
                ]
                  .filter((value): value is string => typeof value === "string")
                  .join(" ")
                  .toLowerCase();
                return haystack.includes(trimmedQuery.toLowerCase());
              })
              .flatMap(([, phoneNumbers]) => Array.from(phoneNumbers)),
          ),
        )
      : [];

    // Для member получаем номера через привязку к сотруднику или из профиля пользователя
    let internalNumbers: string[] | undefined;
    let mobileNumbers: string[] | undefined;

    if (!isAdminOrOwner) {
      // Проверяем привязку к сотруднику PBX
      const userId = typeof user.id === "string" ? user.id : "";
      const pbxLink = userId
        ? await pbxRepository.getLinkByUserId(workspaceId, PBX_PROVIDER, userId)
        : null;

      if (pbxLink?.targetType === "employee" && pbxLink.targetExternalId) {
        // Получаем сотрудника и его номера
        const employee = employeeByExternalId.get(pbxLink.targetExternalId);
        if (employee) {
          // Получаем все номера этого сотрудника
          const relatedNumbers = phoneNumbersByEmployeeExternalId.get(employee.externalId) || [];
          const phoneNums: string[] = [];
          const extNums: string[] = [];

          for (const num of relatedNumbers) {
            if (num.phoneNumber) phoneNums.push(num.phoneNumber);
            if (num.extension) extNums.push(num.extension);
          }

          // Также добавляем extension самого сотрудника
          if (employee.extension) {
            extNums.push(employee.extension);
          }

          mobileNumbers = phoneNums.length > 0 ? phoneNums : undefined;
          internalNumbers = extNums.length > 0 ? extNums : undefined;
        }
      }

      // Если нет привязки к сотруднику, используем номера из профиля пользователя
      if (!internalNumbers && !mobileNumbers) {
        internalNumbers = getInternalNumbersForUser(
          user as { id: string; internalExtensions?: string | null; mobilePhones?: string | null },
        );
        mobileNumbers = getMobileNumbersForUser(
          user as { id: string; internalExtensions?: string | null; mobilePhones?: string | null },
        );
      }
    }

    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];
    // Участник (member) видит только свои звонки — при отсутствии internalExtensions/mobilePhones возвращаем пустой список
    if (context.workspaceRole === "member") {
      const hasIdentifiers = (internalNumbers?.length ?? 0) > 0 || (mobileNumbers?.length ?? 0) > 0;
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
            manager: finalManagerFilters,
            value: input.value ?? [],
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

    // Параллельно выполняем три независимых запроса к БД
    const [rawCalls, totalItems, metrics] = await Promise.all([
      callsService.getCallsWithTranscripts({
        workspaceId,
        limit: input.per_page,
        offset,
        dateFrom,
        dateTo,
        internalNumbers,
        mobileNumbers,
        excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
        directions: normalizedDirections?.length ? normalizedDirections : undefined,
        valueScores: input.value?.length ? input.value : undefined,
        managerInternalNumbers:
          managerInternalNumbers.length > 0 ? managerInternalNumbers : undefined,
        statuses: normalizedStatuses?.length ? normalizedStatuses : undefined,
        managerInternalNumbersForQuery:
          managerInternalNumbersForQuery.length > 0 ? managerInternalNumbersForQuery : undefined,
        q: trimmedQuery,
        sortBy: input.sort_by,
        sortOrder: input.sort_order,
      }),
      callsService.countCalls({
        workspaceId,
        dateFrom,
        dateTo,
        internalNumbers,
        mobileNumbers,
        excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
        directions: normalizedDirections?.length ? normalizedDirections : undefined,
        valueScores: input.value?.length ? input.value : undefined,
        managerInternalNumbers:
          managerInternalNumbers.length > 0 ? managerInternalNumbers : undefined,
        statuses: normalizedStatuses?.length ? normalizedStatuses : undefined,
        managerInternalNumbersForQuery:
          managerInternalNumbersForQuery.length > 0 ? managerInternalNumbersForQuery : undefined,
        q: trimmedQuery,
      }),
      // Исправлено: calculateMetrics теперь учитывает все текущие фильтры
      callsService.calculateMetrics(
        workspaceId,
        excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
        {
          dateFrom,
          dateTo,
          internalNumbers,
          mobileNumbers,
          directions: normalizedDirections?.length ? normalizedDirections : undefined,
          managerInternalNumbers:
            managerInternalNumbers.length > 0 ? managerInternalNumbers : undefined,
          statuses: normalizedStatuses?.length ? normalizedStatuses : undefined,
          managerInternalNumbersForQuery:
            managerInternalNumbersForQuery.length > 0 ? managerInternalNumbersForQuery : undefined,
          q: trimmedQuery,
        },
      ),
    ]);

    const totalPages = Math.ceil(totalItems / input.per_page) || 1;
    const managers: ManagerOption[] = Array.from(managerDisplayNameById.entries())
      .map(([id, name]) => ({ id, name }))
      .filter((item) => item.name.trim().length > 0)
      .filter((item) => {
        // Для обычных пользователей показываем только себя
        return isAdminOrOwner || item.id === user.id;
      })
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

        const trimmedName = item.call.name?.trim();
        const managerName = trimmedName && trimmedName !== "" ? trimmedName : operatorName || null;

        const { filename: _filename, ...publicCall } = item.call;

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
            duration: item.fileDuration ?? item.transcript?.metadata?.durationInSeconds ?? null,
            status: item.call.status,
          },
          transcript: item.transcript
            ? {
                ...item.transcript,
                callType: translateCallType(item.transcript.callType),
              }
            : null,
          evaluation: item.evaluation
            ? {
                ...item.evaluation,
                notAnalyzableReason: translateNotAnalyzableReason(
                  item.evaluation.notAnalyzableReason,
                ),
              }
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
        manager: finalManagerFilters,
        value: input.value ?? [],
        sort_by: input.sort_by ?? "timestamp",
        sort_order: input.sort_order ?? "desc",
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
