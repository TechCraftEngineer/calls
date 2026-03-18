import { MegaPbxConfigNotFoundError, pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxWebhookSchema } from "./schemas";

function getUserEmail(user: unknown): string | undefined {
  return typeof user === "object" && user
    ? "email" in user && typeof (user as { email?: unknown }).email === "string"
      ? (user as { email: string }).email
      : undefined
    : undefined;
}

export const updatePbxWebhook = workspaceAdminProcedure
  .input(pbxWebhookSchema)
  .handler(async ({ input, context }) => {
    const username = getUserEmail(context.user) ?? "system";

    let ok: boolean;
    try {
      ok = await pbxService.updateSettingsPartial(
        context.workspaceId,
        {
          webhookSecret: input.webhookSecret?.trim() || null,
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

    return { success: true, message: "Webhook сохранён" };
  });
