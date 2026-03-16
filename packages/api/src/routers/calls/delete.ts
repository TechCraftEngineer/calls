import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

export const deleteCall = workspaceAdminProcedure
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
      (context.user as Record<string, unknown>).email as string,
    );
    return { success: true, message: `Звонок #${input.call_id} удалён` };
  });
