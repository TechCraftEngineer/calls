import { pbxService, settingsService } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";

export const getIntegrations = workspaceProcedure.handler(async ({ context }) => {
  const [ftpSettings, maxToken, megaPbxSettings, effectiveTelegram] = await Promise.all([
    settingsService.getFtpSettings(context.workspaceId),
    settingsService.getDecryptedBotToken("max_bot_token", context.workspaceId),
    pbxService.getSettings(context.workspaceId),
    settingsService.getEffectiveTelegramBotToken(context.workspaceId),
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
    telegram_bot_token:
      effectiveTelegram.source === "workspace" ? (effectiveTelegram.token ?? "") : "",
    telegram_uses_default: effectiveTelegram.source === "system",
    max_bot_token: maxToken ?? "",
  };
});
