import { MegaPbxConfigNotFoundError, pbxService } from "@calls/db";
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
      ok = await pbxService.updateSettingsPartial(
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
      if (err instanceof MegaPbxConfigNotFoundError) {
        throw new ORPCError("NOT_FOUND", {
          message: "PBX интеграция не настроена",
        });
      }
      throw err;
    }
    if (!ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "PBX интеграция не настроена",
      });
    }

    return { success: true, message: "Настройки синхронизации сохранены" };
  });
