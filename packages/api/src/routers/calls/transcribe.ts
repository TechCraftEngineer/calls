import { inngest, transcribeRequested } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

export const transcribe = workspaceProcedure
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

    // Проверяем, есть ли уже транскрипт у звонка
    const existingTranscript = await context.callsService.getTranscriptByCallId(input.call_id);
    if (existingTranscript) {
      return { success: true, message: "Транскрипт уже существует", alreadyExists: true };
    }

    await inngest.send(transcribeRequested.create({ callId: input.call_id }));
    return { success: true, message: "Транскрипция запущена" };
  });
