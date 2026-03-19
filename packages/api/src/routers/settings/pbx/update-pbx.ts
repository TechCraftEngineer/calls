import { normalizePhoneNumberList, pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxSettingsSchema } from "./schemas";

export const updatePbx = workspaceAdminProcedure
  .input(pbxSettingsSchema)
  .handler(async ({ input, context }) => {
    if (!input.baseUrl?.trim() && input.enabled) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Укажите base URL PBX",
      });
    }

    const username =
      (context.user as Record<string, unknown>)?.email ?? "system";

    const syncFromDate =
      input.syncFromDate?.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.syncFromDate.trim())
        ? input.syncFromDate.trim()
        : null;
    const excludePhoneNumbers = normalizePhoneNumberList(
      input.excludePhoneNumbers,
    );

    await pbxService.updateSettings(
      context.workspaceId,
      {
        ...input,
        baseUrl: input.baseUrl?.trim() ?? "",
        apiKey: input.apiKey || null,
        syncFromDate,
        excludePhoneNumbers,
        webhookSecret: input.webhookSecret || null,
        ftpHost: input.ftpHost || null,
        ftpUser: input.ftpUser || null,
        ftpPassword: input.ftpPassword || null,
      },
      String(username),
    );

    return { success: true, message: "PBX настройки сохранены" };
  });
