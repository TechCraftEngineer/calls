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
