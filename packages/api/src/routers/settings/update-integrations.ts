import { promptsRepository } from "@calls/db";
import { workspaceAdminProcedure } from "../../orpc";
import { updateIntegrationsSchema } from "./schemas";

export const updateIntegrations = workspaceAdminProcedure
  .input(updateIntegrationsSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;

    if (input.telegram_bot_token !== undefined) {
      await promptsRepository.upsert(
        "telegram_bot_token",
        input.telegram_bot_token ?? "",
        "Telegram Bot Token",
        workspaceId,
      );
    }
    if (input.max_bot_token !== undefined) {
      await promptsRepository.upsert(
        "max_bot_token",
        input.max_bot_token ?? "",
        "MAX Bot Token",
        workspaceId,
      );
    }

    return { success: true, message: "Интеграции обновлены" };
  });
