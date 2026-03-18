import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxSettingsSchema } from "./schemas";

export const updatePbx = workspaceAdminProcedure
  .input(pbxSettingsSchema)
  .handler(async ({ input, context }) => {
    if (!input.baseUrl.trim() && input.enabled) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Укажите base URL PBX",
      });
    }

    const username =
      (context.user as Record<string, unknown>)?.email ?? "system";

    await pbxService.updateSettings(
      context.workspaceId,
      {
        ...input,
        apiKey: input.apiKey || null,
        syncFromDate: input.syncFromDate || null,
        webhookSecret: input.webhookSecret || null,
        ftpHost: input.ftpHost || null,
        ftpUser: input.ftpUser || null,
        ftpPassword: input.ftpPassword || null,
      },
      String(username),
    );

    return { success: true, message: "PBX настройки сохранены" };
  });
