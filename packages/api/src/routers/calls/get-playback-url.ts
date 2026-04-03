import { filesService } from "@calls/db";
import { getDownloadUrl } from "@calls/lib";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

export const getPlaybackUrl = workspaceProcedure
  .input(z.object({ call_id: z.string().uuid() }))
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
    return { url, duration: file.durationSeconds ?? null };
  });
