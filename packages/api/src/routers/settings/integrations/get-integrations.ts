import { pbxService, settingsService } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";

export const getIntegrations = workspaceProcedure.handler(
  async ({ context }) => {
    const [ftpSettings, telegramToken, maxToken, megaPbxSettings] =
      await Promise.all([
        settingsService.getFtpSettings(context.workspaceId),
        settingsService.getDecryptedBotToken(
          "telegram_bot_token",
          context.workspaceId,
        ),
        settingsService.getDecryptedBotToken(
          "max_bot_token",
          context.workspaceId,
        ),
        pbxService.getSettings(context.workspaceId),
      ]);

    return {
      ftp: {
        enabled: ftpSettings.enabled,
        host: ftpSettings.host ?? "",
        user: ftpSettings.user ?? "",
        passwordSet: ftpSettings.passwordSet,
        syncFromDate: ftpSettings.syncFromDate,
        excludePhoneNumbers: ftpSettings.excludePhoneNumbers ?? [],
      },
      megapbx: megaPbxSettings,
      telegram_bot_token: telegramToken ?? "",
      max_bot_token: maxToken ?? "",
    };
  },
);
