import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

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

    for (const callId of uniqueCallIds) {
      const deleted = await context.callsService.deleteCall(callId);

      if (!deleted) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось удалить один или несколько звонков",
        });
      }
    }

    const userEmail =
      context.user &&
      typeof context.user === "object" &&
      "email" in context.user
        ? context.user.email
        : undefined;
    const email = typeof userEmail === "string" ? userEmail : "неизвестен";

    await context.systemRepository.addActivityLog(
      "info",
      `Deleted ${uniqueCallIds.length} calls`,
      email,
      context.workspaceId,
    );

    return {
      success: true,
      deletedCount: uniqueCallIds.length,
      deletedCallIds: uniqueCallIds,
      message: `Удалено звонков: ${uniqueCallIds.length}`,
    };
  });
