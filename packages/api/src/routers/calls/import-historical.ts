import { pbxService } from "@calls/db";
import { inngest, pbxSyncRequested } from "@calls/jobs";
import { isValidCalendarIsoDate } from "@calls/shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

const importHistoricalCallsSchema = z.object({
  fromDate: z
    .string()
    .trim()
    .refine((v) => isValidCalendarIsoDate(v), {
      message: "Некорректная дата. Используйте формат YYYY-MM-DD",
    }),
});

export const importHistoricalCalls = workspaceAdminProcedure
  .input(importHistoricalCallsSchema)
  .handler(async ({ input, context }) => {
    const pbxConfig = await pbxService.getConfigWithSecrets(context.workspaceId);

    if (!pbxConfig) {
      throw new ORPCError("NOT_FOUND", {
        message: "PBX интеграция не настроена",
      });
    }

    // Обновляем дату синхронизации в конфиге
    await pbxService.updateSettingsPartial(context.workspaceId, {
      syncFromDate: input.fromDate,
    });

    // Запускаем синхронизацию звонков
    await inngest.send(
      pbxSyncRequested.create({
        workspaceId: context.workspaceId,
        syncType: "calls",
        syncRecordings: pbxConfig.syncRecordings ?? false,
      }),
    );

    return {
      success: true,
      message: "Импорт звонков запущен",
      total: 0, // Будет заполнено после завершения
      imported: 0,
      skipped: 0,
      errors: 0,
    };
  });
