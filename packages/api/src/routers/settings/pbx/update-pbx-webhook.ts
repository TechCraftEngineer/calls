import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { getUserEmail } from "./get-user-email";
import { pbxWebhookSchema } from "./schemas";

export const updatePbxWebhook = workspaceAdminProcedure
  .input(pbxWebhookSchema)
  .handler(async ({ input, context }) => {
    const username = getUserEmail(context.user) ?? "system";

    const trimmedSecret = input.webhookSecret?.trim();
    const partial: { webhookSecret?: string | null } = {};
    if (trimmedSecret) {
      partial.webhookSecret = trimmedSecret;
    }

    let ok: boolean;
    try {
      ok = await pbxService.updateWebhook(
        context.workspaceId,
        partial,
        String(username),
      );
    } catch (err: unknown) {
      console.error("Failed to update PBX webhook:", err);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить webhook",
      });
    }
    if (!ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить webhook",
      });
    }

    return { success: true, message: "Webhook сохранён" };
  });
