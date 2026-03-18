import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxWebhookSchema } from "./schemas";

export const updatePbxWebhook = workspaceAdminProcedure
  .input(pbxWebhookSchema)
  .handler(async ({ input, context }) => {
    const username =
      (context.user as Record<string, unknown>)?.email ?? "system";

    await pbxService.updateSettingsPartial(
      context.workspaceId,
      {
        webhookSecret: input.webhookSecret?.trim() || null,
      },
      String(username),
    );

    return { success: true, message: "Webhook сохранён" };
  });
