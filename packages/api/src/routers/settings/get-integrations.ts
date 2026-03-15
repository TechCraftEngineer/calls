import { promptsRepository, settingsService } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

export const getIntegrations = workspaceProcedure.handler(
  async ({ context }) => {
    const [ftpSettings, telegramToken, maxToken] = await Promise.all([
      settingsService.getFtpSettings(context.workspaceId),
      promptsRepository.findByKeyWithDefault(
        "telegram_bot_token",
        context.workspaceId,
      ),
      promptsRepository.findByKeyWithDefault(
        "max_bot_token",
        context.workspaceId,
      ),
    ]);

    return {
      ftp: {
        enabled: ftpSettings.enabled,
        host: ftpSettings.host ?? "",
        user: ftpSettings.user ?? "",
        passwordSet: ftpSettings.passwordSet,
      },
      telegram_bot_token: telegramToken ?? "",
      max_bot_token: maxToken ?? "",
    };
  },
);
