import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxAccessSchema } from "./schemas";

export const updatePbxAccess = workspaceAdminProcedure
  .input(pbxAccessSchema)
  .handler(async ({ input, context }) => {
    if (!input.baseUrl.trim() && input.enabled) {
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
        : undefined;

    const partial: {
      enabled: boolean;
      baseUrl: string;
      apiKey?: string | null;
      syncFromDate?: string | null;
    } = {
      enabled: input.enabled,
      baseUrl: input.baseUrl.trim(),
      syncFromDate: syncFromDate ?? null,
    };
    if (input.apiKey !== undefined) {
      partial.apiKey = input.apiKey?.trim() || null;
    }

    await pbxService.updateSettingsPartial(
      context.workspaceId,
      partial,
      String(username),
    );

    return { success: true, message: "Доступ к API сохранён" };
  });
