import { filesService } from "@calls/db";
import { getDownloadUrl } from "@calls/lib";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

// Вспомогательная функция для валидации UUID
function isValidUuid(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export const getEnhancedPlaybackUrl = workspaceProcedure
  .input(
    z.object({
      call_id: z.string().refine((val) => isValidUuid(val), {
        message: "Некорректный формат ID звонка",
      }),
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

    // Валидация enhancedAudioFileId
    if (!isValidUuid(call.enhancedAudioFileId)) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Некорректный ID файла улучшенного аудио",
      });
    }

    const file = await filesService.getFileById(call.enhancedAudioFileId);
    if (!file) {
      throw new ORPCError("NOT_FOUND", {
        message: "Файл улучшенного аудио не найден",
      });
    }
    const url = await getDownloadUrl(file.storageKey);
    return { url };
  });
