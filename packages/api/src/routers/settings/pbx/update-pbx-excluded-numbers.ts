import {
  MegaPbxConfigNotFoundError,
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
      ok = await pbxService.updateSettingsPartial(
        context.workspaceId,
        {
          excludePhoneNumbers,
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
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "PBX интеграция не настроена",
      });
    }

    return { success: true, message: "Исключённые номера сохранены" };
  });
