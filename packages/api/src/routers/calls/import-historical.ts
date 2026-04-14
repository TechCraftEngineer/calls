import { pbxService } from "@calls/db";
import { inngest, processImportedCalls } from "@calls/jobs";
import { syncPbxCalls } from "@calls/jobs/pbx/sync";
import { isNotFutureIsoDate, isValidCalendarIsoDate } from "@calls/shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

const importHistoricalCallsSchema = z.object({
  fromDate: z
    .string()
    .trim()
    .refine((v) => isValidCalendarIsoDate(v), {
      message: "Некорректная дата. Используйте формат YYYY-MM-DD",
    })
    .refine((v) => isNotFutureIsoDate(v), {
      message: "Дата не может быть в будущем",
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

    // Синхронно импортируем звонки
    const syncResult = await syncPbxCalls(
      context.workspaceId,
      { ...pbxConfig, syncRecordings: true, syncFromDate: input.fromDate },
      undefined,
    );

    // Запускаем обработку импортированных звонков через Inngest
    // Получаем список импортированных звонков для постановки в очередь на транскрибацию
    if (syncResult.calls > 0) {
      // Отправляем событие для запуска обработки звонков
      // Inngest функция сама найдет необработанные звонки и поставит их в очередь
      await inngest.send(
        processImportedCalls.create({
          workspaceId: context.workspaceId,
          importedCount: syncResult.calls,
        }),
      );
    }

    return {
      success: true,
      message: "Импорт звонков завершен",
      total: syncResult.calls + syncResult.skipped,
      imported: syncResult.calls,
      skipped: syncResult.skipped,
      errors: syncResult.errors?.length ?? 0,
      transcriptionsQueued: syncResult.transcriptionsQueued ?? 0,
    };
  });
