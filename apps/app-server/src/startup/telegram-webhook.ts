/**
 * Telegram webhook setup on server startup.
 */

import { createLogger } from "@calls/api";
import {
  getDefaultWorkspace,
  promptsRepository,
  workspacesService,
} from "@calls/db";
import { Bot } from "grammy";

const logger = createLogger("backend-server");

export async function setupTelegramWebhook(): Promise<boolean> {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.info("TELEGRAM_WEBHOOK_URL not configured, skipping webhook setup");
    return true;
  }

  const maxRetries = 3;
  const retryDelay = 5000;

  let defaultWs: Awaited<ReturnType<typeof workspacesService.getBySlug>>;
  try {
    defaultWs = await getDefaultWorkspace(workspacesService);
    if (!defaultWs) {
      logger.warn("Default workspace not found, skipping webhook setup");
      return true;
    }
  } catch (error) {
    logger.error("Failed to get default workspace for telegram webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const token = await promptsRepository.findByKeyWithDefault(
        "telegram_bot_token",
        defaultWs.id,
      );
      if (!token?.trim()) {
        logger.warn(
          "Telegram bot token not configured, skipping webhook setup",
        );
        return true;
      }

      const bot = new Bot(token);
      const webhookInfo = await bot.api.getWebhookInfo();

      if (webhookInfo.url !== webhookUrl) {
        await bot.api.setWebhook(webhookUrl);
        logger.info("Telegram webhook set successfully", {
          url: webhookUrl,
          attempt,
        });
      } else {
        logger.info("Telegram webhook already configured");
      }

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `Failed to set Telegram webhook (attempt ${attempt}/${maxRetries})`,
        { error: errorMsg, url: webhookUrl, attempt },
      );

      if (attempt < maxRetries) {
        logger.info(
          `Retrying webhook setup in ${retryDelay / 1000} seconds...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  logger.error("Failed to set Telegram webhook after all retries", {
    url: webhookUrl,
    maxRetries,
  });
  return false;
}
