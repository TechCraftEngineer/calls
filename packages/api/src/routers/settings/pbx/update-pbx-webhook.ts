import { MegaPbxConfigNotFoundError, pbxService } from "@calls/db";
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
      ok = await pbxService.updateSettingsPartial(
        context.workspaceId,
        partial,
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
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "PBX интеграция не настроена",
      });
    }

    return { success: true, message: "Webhook сохранён" };
  });
