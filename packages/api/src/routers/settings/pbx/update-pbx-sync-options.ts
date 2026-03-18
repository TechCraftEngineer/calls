import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxSyncOptionsSchema } from "./schemas";

export const updatePbxSyncOptions = workspaceAdminProcedure
  .input(pbxSyncOptionsSchema)
  .handler(async ({ input, context }) => {
    const username =
      (context.user as Record<string, unknown>)?.email ?? "system";

    await pbxService.updateSettingsPartial(
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

    return { success: true, message: "Настройки синхронизации сохранены" };
  });
