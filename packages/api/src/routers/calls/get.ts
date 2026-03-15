import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

export const get = workspaceProcedure
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
    const evaluation = await context.callsService.getEvaluation(input.call_id);
    return {
      call,
      transcript,
      evaluation,
      operator_name: call.name ?? null,
    };
  });
