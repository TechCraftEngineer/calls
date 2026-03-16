import { createLogger } from "@calls/api";
import { settingsService } from "@calls/db";
import { deleteTelegramWebhook, setTelegramWebhook } from "@calls/telegram-bot";
import { workspaceAdminProcedure } from "../../../orpc";
import { updateIntegrationsSchema } from "../schemas";

const logger = createLogger("update-integrations");

export const updateIntegrations = workspaceAdminProcedure
  .input(updateIntegrationsSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const webhookResults: { success: boolean; error?: string }[] = [];

    if (input.telegram_bot_token !== undefined) {
      const newToken = input.telegram_bot_token?.trim() ?? "";
      const baseUrl = (
        process.env.API_PUBLIC_URL ??
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL
      )?.replace(/\/$/, "");

      if (newToken) {
        await settingsService.updateBotToken(
          "telegram_bot_token",
          newToken,
          "Telegram Bot Token",
          workspaceId,
        );

        if (baseUrl) {
          try {
            const webhookUrl = `${baseUrl}/api/telegram-webhook/${workspaceId}`;
            await setTelegramWebhook(newToken, webhookUrl);
            webhookResults.push({ success: true });
            logger.info("Telegram webhook registered successfully", {
              workspaceId,
              webhookUrl,
            });
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            webhookResults.push({ success: false, error: errorMsg });
            logger.error("Failed to register Telegram webhook", {
              workspaceId,
              error: errorMsg,
              baseUrl,
            });
            // Не прерываем операцию - webhook зарегистрируется при следующем старте сервера
          }
        } else {
          logger.warn("No base URL configured for Telegram webhook setup", {
            workspaceId,
          });
        }
      } else {
        const currentToken = await settingsService.getDecryptedBotToken(
          "telegram_bot_token",
          workspaceId,
        );
        await settingsService.updateBotToken(
          "telegram_bot_token",
          "",
          "Telegram Bot Token",
          workspaceId,
        );

        if (currentToken) {
          try {
            await deleteTelegramWebhook(currentToken);
            webhookResults.push({ success: true });
            logger.info("Telegram webhook deleted successfully", {
              workspaceId,
            });
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            webhookResults.push({ success: false, error: errorMsg });
            logger.error("Failed to delete Telegram webhook", {
              workspaceId,
              error: errorMsg,
            });
            // Не критично - webhook перестанет работать при смене токена
          }
        }
      }
    }

    if (input.max_bot_token !== undefined) {
      await settingsService.updateBotToken(
        "max_bot_token",
        input.max_bot_token ?? "",
        "MAX Bot Token",
        workspaceId,
      );
    }

    return {
      success: true,
      message: "Интеграции обновлены",
      webhookSetup: webhookResults.length > 0 ? webhookResults : undefined,
    };
  });
