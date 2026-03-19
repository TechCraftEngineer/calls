import { MegaPbxConfigNotFoundError, pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { getUserEmail } from "./get-user-email";
import { pbxAccessSchema } from "./schemas";

export const updatePbxAccess = workspaceAdminProcedure
  .input(pbxAccessSchema)
  .handler(async ({ input, context }) => {
    if (!input.baseUrl?.trim() && input.enabled) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Укажите base URL PBX",
      });
    }

    const username = getUserEmail(context.user) ?? "system";

    const rawSyncFromDate = input.syncFromDate?.trim();
    const syncFromDate =
      rawSyncFromDate && rawSyncFromDate.length > 0
        ? rawSyncFromDate
        : undefined;

    const partial: {
      enabled: boolean;
      baseUrl: string;
      apiKey?: string | null;
      syncFromDate?: string | null;
    } = {
      enabled: input.enabled,
      baseUrl: input.baseUrl?.trim() ?? "",
    };
    if (input.apiKey !== undefined) {
      partial.apiKey = input.apiKey?.trim() || null;
    }

    if (syncFromDate) {
      partial.syncFromDate = syncFromDate;
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
        message: "Не удалось обновить настройки PBX",
      });
    }

    return { success: true, message: "Доступ к API сохранён" };
  });
