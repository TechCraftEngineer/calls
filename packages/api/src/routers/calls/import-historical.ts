import { pbxService } from "@calls/db";
import { inngest, pbxSyncRequested, processImportedCalls, transcribeRequested } from "@calls/jobs";
import { syncPbxCalls } from "@calls/jobs/pbx/sync";
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
    })
    .refine(
      (v) => {
        // Parse ISO date string and compare with today (date-only comparison)
        const parts = v.split("-").map(Number);
        if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) {
          return false;
        }
        const [year, month, day] = parts as [number, number, number];
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return inputDate <= today;
      },
      {
        message: "Дата не может быть в будущем",
      },
    ),
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
      { ...pbxConfig, syncRecordings: pbxConfig.syncRecordings ?? false },
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
