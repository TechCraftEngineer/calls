import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { createLogger } from "../../logger";
import { workspaceAdminProcedure } from "../../orpc";

const logger = createLogger("calls-delete-many");

export const deleteManyCalls = workspaceAdminProcedure
  .input(
    z.object({
      call_ids: z.array(z.string()).min(1).max(100),
    }),
  )
  .handler(async ({ input, context }) => {
    const uniqueCallIds = [...new Set(input.call_ids)];

    const calls = await Promise.all(
      uniqueCallIds.map(async (callId) => ({
        callId,
        call: await context.callsService.getCall(callId),
      })),
    );

    for (const { callId, call } of calls) {
      if (!call) {
        throw new ORPCError("NOT_FOUND", {
          message: `Звонок #${callId} не найден`,
        });
      }

      if (call.workspaceId !== context.workspaceId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к одному или нескольким звонкам",
        });
      }
    }

    const deletedIds: string[] = [];
    const failed: Array<{ callId: string; message: string }> = [];

    for (const callId of uniqueCallIds) {
      try {
        const deleted = await context.callsService.deleteCall(callId);

        if (!deleted) {
          const message = "Не удалось удалить звонок";
          failed.push({ callId, message });
          logger.warn("Удаление звонка завершилось без результата", { callId });
          continue;
        }

        deletedIds.push(callId);
      } catch (error) {
        const message = "Не удалось удалить звонок";
        failed.push({ callId, message });
        logger.error("Ошибка при удалении звонка", { callId, error });
      }
    }

    if (deletedIds.length === 0) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось удалить выбранные звонки",
      });
    }

    const userEmail =
      context.user && typeof context.user === "object" && "email" in context.user
        ? context.user.email
        : undefined;
    const email = typeof userEmail === "string" ? userEmail : "неизвестен";

    await context.systemRepository.addActivityLog(
      "info",
      `Удалено ${deletedIds.length} вызовов`,
      email,
      context.workspaceId,
    );

    return {
      success: failed.length === 0,
      deletedCount: deletedIds.length,
      deletedCallIds: deletedIds,
      failed,
      message:
        failed.length > 0
          ? `Удалено звонков: ${deletedIds.length}. Ошибок: ${failed.length}`
          : `Удалено звонков: ${deletedIds.length}`,
    };
  });
