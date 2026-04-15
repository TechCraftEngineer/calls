import { pbxService } from "@calls/db";
import { inngest, pbxSyncRequested } from "@calls/jobs";
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

    // Отправляем событие для асинхронной синхронизации звонков
    // Обработка выполняется в pbxSyncRequestedFn (packages/jobs/src/inngest/functions/pbx-sync.ts)
    await inngest.send(
      pbxSyncRequested.create({
        workspaceId: context.workspaceId,
        syncType: "calls",
        syncRecordings: true,
      }),
    );

    return {
      success: true,
      message: "Импорт звонков поставлен в очередь",
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      transcriptionsQueued: 0,
    };
  });
