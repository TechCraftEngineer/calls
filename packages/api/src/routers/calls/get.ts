import { filesService, usersRepository } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { getDisplayNameFromUser } from "./utils";

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
    const [transcript, evaluation] = await Promise.all([
      context.callsService.getTranscriptByCallId(input.call_id),
      context.callsService.getEvaluation(input.call_id),
    ]);

    // Размер и длительность: из связанного файла
    let sizeBytes: number | null | undefined;
    let durationSeconds: number | null | undefined;
    if (call.fileId) {
      try {
        const file = await filesService.getFileById(call.fileId);
        sizeBytes = file?.sizeBytes ?? undefined;
        durationSeconds = file?.durationSeconds ?? undefined;
      } catch (error) {
        console.warn(`File not found for call ${input.call_id}:`, error);
      }
    }

    const managerFromWorkspace = call.internalNumber
      ? await usersRepository.findUserByInternalNumber(
          call.workspaceId,
          call.internalNumber,
        )
      : null;
    const operatorName =
      (transcript?.metadata &&
      typeof transcript.metadata === "object" &&
      "operatorName" in transcript.metadata &&
      typeof transcript.metadata.operatorName === "string"
        ? transcript.metadata.operatorName
        : null) ??
      call.name ??
      null;
    const managerName =
      (managerFromWorkspace
        ? getDisplayNameFromUser(managerFromWorkspace)
        : null) ??
      operatorName ??
      call.name ??
      null;

    const { filename: _filename, ...publicCall } = call;

    return {
      call: {
        ...publicCall,
        timestamp:
          call.timestamp instanceof Date
            ? call.timestamp.toISOString()
            : call.timestamp,
        sizeBytes: (sizeBytes === undefined ? null : sizeBytes) as
          | number
          | null,
        managerName,
        operatorName,
        managerId: managerFromWorkspace?.id ?? null,
      },
      transcript,
      evaluation,
    };
  });
