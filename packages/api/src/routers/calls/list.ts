import type { CallWithTranscript } from "@calls/db";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import {
  buildInternalNumberToManagerMap,
  getInternalNumbersForUser,
  getMobileNumbersForUser,
} from "./utils";

const transcriptMetadataSchema = z
  .object({ operatorName: z.string().optional() })
  .passthrough();

const listCallsSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(15),
  q: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  direction: z.string().optional(),
  manager: z.string().optional(),
  status: z.string().optional(),
  value: z.array(z.number()).optional(),
  operator: z.array(z.string()).optional(),
});

export const list = workspaceProcedure
  .input(listCallsSchema)
  .handler(async ({ input, context }) => {
    const { callsService, user, workspaceId } = context;
    const offset = (input.page - 1) * input.per_page;

    const dateFrom = input.date_from
      ? `${input.date_from}T00:00:00`
      : undefined;
    const dateTo = input.date_to ? `${input.date_to}T23:59:59` : undefined;

    const internalNumbers = getInternalNumbersForUser(user);
    const mobileNumbers = getMobileNumbersForUser(user);

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
            direction: input.direction ?? "all",
            status: input.status ?? "all",
            manager: input.manager ?? "",
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
      direction:
        input.direction === "incoming" || input.direction === "Входящий"
          ? "Входящий"
          : input.direction === "outgoing" || input.direction === "Исходящий"
            ? "Исходящий"
            : undefined,
      valueScores: input.value?.length ? input.value : undefined,
      operators: input.operator?.length ? input.operator : undefined,
      manager: input.manager || undefined,
      status: input.status || undefined,
      q: input.q?.trim() || undefined,
    });

    const totalItems = await callsService.countCalls({
      workspaceId,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction:
        input.direction === "incoming" || input.direction === "Входящий"
          ? "Входящий"
          : input.direction === "outgoing" || input.direction === "Исходящий"
            ? "Исходящий"
            : undefined,
      valueScores: input.value?.length ? input.value : undefined,
      operators: input.operator?.length ? input.operator : undefined,
      manager: input.manager || undefined,
      status: input.status || undefined,
      q: input.q?.trim() || undefined,
    });

    const totalPages = Math.ceil(totalItems / input.per_page) || 1;
    const metrics = await callsService.calculateMetrics(workspaceId);
    const members = await context.workspacesService.getMembers(workspaceId);
    const managers = members
      .map((m: { user?: unknown }) => m.user)
      .filter(
        (u: unknown) => u && (u as Record<string, unknown>).internalExtensions,
      );

    const internalToManager = buildInternalNumberToManagerMap(members);

    const callsWithTranscripts = rawCalls.map((item: CallWithTranscript) => {
      const operatorName = (() => {
        const meta = item.transcript?.metadata;
        const parsed = transcriptMetadataSchema.safeParse(meta);
        return parsed.success && typeof parsed.data.operatorName === "string"
          ? parsed.data.operatorName
          : (item.call.name ?? null);
      })();
      const managerFromWorkspace = item.call.internalNumber
        ? internalToManager.get(item.call.internalNumber)
        : undefined;
      const managerName =
        managerFromWorkspace?.displayName ??
        operatorName ??
        item.call.name ??
        null;

      return {
        ...item,
        call: {
          ...item.call,
          timestamp:
            item.call.timestamp instanceof Date
              ? item.call.timestamp.toISOString()
              : item.call.timestamp,
          managerName,
          operatorName,
          managerId: managerFromWorkspace?.userId ?? null,
        },
      };
    });

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
        direction: input.direction ?? "all",
        status: input.status ?? "all",
        manager: input.manager ?? "",
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
