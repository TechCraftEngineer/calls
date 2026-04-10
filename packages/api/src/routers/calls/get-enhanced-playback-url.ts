import { filesService } from "@calls/db";
import { getDownloadUrl } from "@calls/lib";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

const uuidV7Schema = z
  .string()
  .uuid()
  .refine((uuid) => uuid.split("-")[2]?.startsWith("7"), {
    message: "Требуется UUID v7",
  });
const uuidV7WithPrefixSchema = z
  .string()
  .regex(/^ws_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Неверный формат ID звонка с префиксом",
  });
const callIdSchema = z.union([uuidV7Schema, uuidV7WithPrefixSchema]);

export const getEnhancedPlaybackUrl = workspaceProcedure
  .input(
    z.object({
      call_id: callIdSchema,
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
    if (!call.enhancedAudioFileId) {
      return { url: null }; // Улучшенное аудио отсутствует
    }

    const file = await filesService.getFileById(call.enhancedAudioFileId);
    if (!file) {
      throw new ORPCError("NOT_FOUND", {
        message: "Файл улучшенного аудио не найден",
      });
    }
    const url = await getDownloadUrl(file.storageKey);
    return { url, duration: file.durationSeconds ?? null };
  });
