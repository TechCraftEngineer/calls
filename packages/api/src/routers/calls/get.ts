import { filesService } from "@calls/db";
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

    // Размер: из call или из связанного файла
    let sizeBytes: number | null | undefined = call.sizeBytes;
    if (sizeBytes == null && call.fileId) {
      try {
        const file = await filesService.getFileById(call.fileId);
        sizeBytes = file?.sizeBytes ?? undefined;
      } catch (error) {
        console.warn(`File not found for call ${input.call_id}:`, error);
      }
    }

    return {
      call: {
        ...call,
        timestamp:
          call.timestamp instanceof Date
            ? call.timestamp.toISOString()
            : call.timestamp,
        sizeBytes: (sizeBytes === undefined ? null : sizeBytes) as
          | number
          | null,
        managerName: call.name ?? null,
        operatorName: call.name ?? null,
      },
      transcript,
      evaluation,
    };
  });
