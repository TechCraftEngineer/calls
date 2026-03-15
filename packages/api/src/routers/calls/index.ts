import { filesService } from "@calls/db";
import { inngest } from "@calls/jobs";
import { getDownloadUrl } from "@calls/lib";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure, workspaceProcedure } from "../../orpc";
import { generateRecommendations } from "./generate-recommendations";
import {
  formatDuration,
  getInternalNumbersForUser,
  getMobileNumbersForUser,
} from "./utils";

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

export const callsRouter = {
  list: workspaceProcedure
    .input(listCallsSchema)
    .handler(async ({ input, context }) => {
      const { callsService, user, workspaceId } = context;
      const offset = (input.page - 1) * input.per_page;

      const dateFrom = input.date_from
        ? `${input.date_from}T00:00:00`
        : undefined;
      const dateTo = input.date_to ? `${input.date_to}T23:59:59` : undefined;

      const internalNumbers = getInternalNumbersForUser(user!);
      const mobileNumbers = getMobileNumbersForUser(user!);

      const callsWithTranscripts = await callsService.getCallsWithTranscripts({
        workspaceId: workspaceId!,
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
        workspaceId: workspaceId!,
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
      const metrics = await callsService.calculateMetrics(workspaceId!);
      const members = await context.workspacesService.getMembers(workspaceId!);
      const managers = members
        .map((m: { user?: unknown }) => m.user)
        .filter(
          (u: unknown) =>
            u && (u as Record<string, unknown>).internalExtensions,
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
          direction: input.direction ?? "all",
          status: input.status ?? "all",
          manager: input.manager ?? "",
          value: input.value ?? [],
          operator: input.operator ?? [],
        },
        metrics: {
          total_calls: totalItems,
          transcribed: metrics.transcribed,
          avg_duration: metrics.avg_duration,
          last_sync: metrics.last_sync,
        },
        managers,
      };
    }),

  getPlaybackUrl: workspaceProcedure
    .input(z.object({ call_id: z.string() }))
    .handler(async ({ input, context }) => {
      const call = await context.callsService.getCall(input.call_id);
      if (!call) {
        throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
      }
      if (call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому звонку",
        });
      }
      if (!call.fileId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Запись звонка недоступна (файл не привязан)",
        });
      }
      const file = await filesService.getFileById(call.fileId);
      if (!file) {
        throw new ORPCError("NOT_FOUND", {
          message: "Файл записи не найден",
        });
      }
      const url = await getDownloadUrl(file.storageKey);
      return { url };
    }),

  get: workspaceProcedure
    .input(z.object({ call_id: z.string() }))
    .handler(async ({ input, context }) => {
      const call = await context.callsService.getCall(input.call_id);
      if (!call) {
        throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
      }
      if (call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому звонку",
        });
      }
      const transcript = await context.callsService.getTranscriptByCallId(
        input.call_id,
      );
      const evaluation = await context.callsService.getEvaluation(
        input.call_id,
      );
      const durationSeconds = call.duration ?? 0;
      return {
        call,
        transcript,
        evaluation,
        operator_name: call.name ?? null,
        duration_seconds: durationSeconds,
        duration_formatted: formatDuration(durationSeconds),
      };
    }),

  transcribe: workspaceProcedure
    .input(
      z.object({
        call_id: z.string(),
        model: z.string().optional().default("assemblyai"),
      }),
    )
    .handler(async ({ input, context }) => {
      const call = await context.callsService.getCall(input.call_id);
      if (!call) {
        throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
      }
      if (call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому звонку",
        });
      }
      await inngest.send({
        name: "call/transcribe.requested",
        data: { callId: input.call_id, model: input.model },
      });
      return { success: true, message: "Транскрипция запущена" };
    }),

  evaluate: workspaceProcedure
    .input(z.object({ call_id: z.string() }))
    .handler(async ({ input, context }) => {
      const call = await context.callsService.getCall(input.call_id);
      if (!call) {
        throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
      }
      if (call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому звонку",
        });
      }
      throw new ORPCError("NOT_IMPLEMENTED", {
        message: "Переоценка звонка пока не реализована",
      });
    }),

  generateRecommendations: workspaceProcedure
    .input(z.object({ call_id: z.string() }))
    .handler(async ({ input, context }) => {
      const call = await context.callsService.getCall(input.call_id);
      if (call && call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому звонку",
        });
      }
      return generateRecommendations(
        input.call_id,
        context.callsService,
        context.promptsService,
        context.workspaceId!,
      );
    }),

  delete: workspaceAdminProcedure
    .input(z.object({ call_id: z.string() }))
    .handler(async ({ input, context }) => {
      const call = await context.callsService.getCall(input.call_id);
      if (!call) {
        throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
      }
      if (call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому звонку",
        });
      }
      if (!(await context.callsService.deleteCall(input.call_id))) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось удалить звонок",
        });
      }
      await context.systemRepository.addActivityLog(
        "info",
        `Deleted call #${input.call_id}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: `Звонок #${input.call_id} удалён` };
    }),
};
