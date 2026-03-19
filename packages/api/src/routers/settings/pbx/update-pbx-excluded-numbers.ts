import {
  normalizePhoneNumberList,
  pbxService,
} from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { getUserEmail } from "./get-user-email";
import { pbxExcludePhoneNumbersSchema } from "./schemas";

export const updatePbxExcludedNumbers = workspaceAdminProcedure
  .input(pbxExcludePhoneNumbersSchema)
  .handler(async ({ input, context }) => {
    const username = getUserEmail(context.user) ?? "system";
    const excludePhoneNumbers = normalizePhoneNumberList(
      input.excludePhoneNumbers,
    );

    let ok: boolean;
    try {
      ok = await pbxService.updateExcludedNumbers(
        context.workspaceId,
        {
          excludePhoneNumbers,
        },
        String(username),
      );
    } catch (err: unknown) {
      console.error("Failed to update PBX excluded numbers:", err);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить исключённые номера",
      });
    }

    if (!ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось обновить исключённые номера",
      });
    }

    return { success: true, message: "Исключённые номера сохранены" };
  });
