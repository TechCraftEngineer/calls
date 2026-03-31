import { evaluateRequested, inngest } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

export const evaluate = workspaceProcedure
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
    await inngest.send(evaluateRequested.create({ callId: input.call_id }));
    return {
      success: true,
      message: "Оценка звонка запущена. Результат появится через несколько секунд.",
    };
  });
