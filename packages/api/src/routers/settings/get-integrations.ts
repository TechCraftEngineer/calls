import { promptsService, settingsService } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

export const getIntegrations = workspaceProcedure.handler(
  async ({ context }) => {
    const [megafonFtp, telegramToken, maxToken] = await Promise.all([
      settingsService.getMegafonFtpSettings(context.workspaceId),
      promptsService.getPrompt("telegram_bot_token", context.workspaceId),
      promptsService.getPrompt("max_bot_token", context.workspaceId),
    ]);

    return {
      megafon_ftp: {
        enabled: megafonFtp.enabled,
        host: megafonFtp.host ?? "",
        user: megafonFtp.user ?? "",
        password: megafonFtp.password ?? "",
      },
      telegram_bot_token: telegramToken ?? "",
      max_bot_token: maxToken ?? "",
    };
  },
);
