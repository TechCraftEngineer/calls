import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { getUserEmail } from "./get-user-email";
import { pbxSyncOptionsSchema } from "./schemas";

export const updatePbxSyncOptions = workspaceAdminProcedure
  .input(pbxSyncOptionsSchema)
  .handler(async ({ input, context }) => {
    const username = getUserEmail(context.user) ?? "system";

    let ok: boolean;
    try {
      ok = await pbxService.updateSyncOptions(
        context.workspaceId,
        {
          syncEmployees: input.syncEmployees,
          syncNumbers: input.syncNumbers,
          syncCalls: input.syncCalls,
          syncRecordings: input.syncRecordings,
          webhooksEnabled: input.webhooksEnabled,
        },
        String(username),
      );
    } catch (err: unknown) {
      console.error("Failed to update PBX sync options:", err);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить настройки синхронизации",
      });
    }
    if (!ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить настройки синхронизации",
      });
    }

    return { success: true, message: "Настройки синхронизации сохранены" };
  });
