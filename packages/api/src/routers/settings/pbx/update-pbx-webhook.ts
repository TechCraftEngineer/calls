import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { getUserEmail } from "./get-user-email";
import { pbxWebhookSchema } from "./schemas";

const WEBHOOK_SECRET_BYTES = 32;

const WEBHOOK_SECRET_MIN_LENGTH = WEBHOOK_SECRET_BYTES * 2;

export const updatePbxWebhook = workspaceAdminProcedure
  .input(pbxWebhookSchema)
  .handler(async ({ input, context }) => {
    const username = getUserEmail(context.user) ?? "system";

    const trimmedSecret = input.webhookSecret?.trim();

    // Server-side validation for webhook secret min length
    if (trimmedSecret !== undefined && trimmedSecret !== "") {
      const secretValidation = z
        .string()
        .min(
          WEBHOOK_SECRET_MIN_LENGTH,
          `Секрет должен содержать минимум ${WEBHOOK_SECRET_MIN_LENGTH} символов`,
        )
        .safeParse(trimmedSecret);

      if (!secretValidation.success) {
        const firstIssue = secretValidation.error.issues[0];
        throw new ORPCError("BAD_REQUEST", {
          message: firstIssue?.message ?? "Некорректный секрет",
        });
      }
    }

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
