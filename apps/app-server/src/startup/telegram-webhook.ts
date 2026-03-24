/**
 * Telegram webhook setup on server startup.
 * SaaS: регистрирует webhook для каждого workspace с настроенным ботом.
 */

import { createLogger } from "@calls/api";
import { settingsService } from "@calls/db";
import { setTelegramWebhook } from "@calls/telegram-bot";

const logger = createLogger("backend-server");

export type SetupTelegramWebhooksResult = {
  success: boolean;
  results: Array<{
    workspaceId: string;
    success: boolean;
    error?: string;
    skipped?: boolean;
  }>;
};

export async function setupTelegramWebhooks(): Promise<SetupTelegramWebhooksResult> {
  const baseUrl = (
    process.env.API_PUBLIC_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL
  )?.replace(/\/$/, "");
  if (!baseUrl) {
    logger.info(
      "No public URL (APP_URL/NEXT_PUBLIC_APP_URL) configured, skipping webhook setup",
    );
    return { success: true, results: [] };
  }

  const maxRetries = 3;
  const retryDelay = 5000;
  /** Ограничение параллелизма — защита от rate limit Telegram API при большом числе workspace */
  const concurrencyLimit = 5;

  const workspaceIds = await settingsService.getWorkspaceIdsWithTelegramBot();
  if (workspaceIds.length === 0) {
    logger.info("No workspaces with Telegram bot configured");
    const systemToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!systemToken) {
      return { success: true, results: [] };
    }

    try {
      await setTelegramWebhook(
        systemToken,
        `${baseUrl}/api/telegram-webhook-default`,
      );
      logger.info("Default Telegram webhook set successfully");
      return { success: true, results: [] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Failed to set default Telegram webhook", {
        error: errorMsg,
      });
      return {
        success: false,
        results: [
          {
            workspaceId: "default",
            success: false,
            error: errorMsg,
            skipped: false,
          },
        ],
      };
    }
  }

  logger.info("Setting up Telegram webhooks", {
    count: workspaceIds.length,
    concurrency: concurrencyLimit,
  });

  const setupOne = async (workspaceId: string) => {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = await settingsService.getDecryptedBotToken(
          "telegram_bot_token",
          workspaceId,
        );
        if (!token?.trim()) {
          logger.info("Skipping workspace with empty token", { workspaceId });
          return {
            workspaceId,
            success: true,
            skipped: true,
          };
        }

        const webhookUrl = `${baseUrl}/api/telegram-webhook/${workspaceId}`;
        await setTelegramWebhook(token, webhookUrl);
        logger.info("Telegram webhook set successfully", {
          workspaceId,
          url: webhookUrl,
          attempt,
        });
        return {
          workspaceId,
          success: true,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        logger.error(
          `Failed to set Telegram webhook for workspace ${workspaceId} (attempt ${attempt}/${maxRetries})`,
          { error: lastError, workspaceId, attempt },
        );

        if (attempt < maxRetries) {
          logger.info(
            `Retrying webhook setup for workspace ${workspaceId} in ${retryDelay / 1000} seconds...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    return {
      workspaceId,
      success: false,
      error: lastError,
    };
  };

  // Обработка батчами для ограничения параллелизма
  const results: Awaited<ReturnType<typeof setupOne>>[] = [];
  for (let i = 0; i < workspaceIds.length; i += concurrencyLimit) {
    const batch = workspaceIds.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch.map(setupOne));
    results.push(...batchResults);
  }
  const allSuccess = results.every((r) => r.success || r.skipped);

  const systemToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  let defaultWebhookSuccess = true;
  if (systemToken) {
    try {
      await setTelegramWebhook(
        systemToken,
        `${baseUrl}/api/telegram-webhook-default`,
      );
      logger.info("Default Telegram webhook set successfully");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      defaultWebhookSuccess = false;
      logger.error("Failed to set default Telegram webhook", {
        error: errorMsg,
      });
      results.push({
        workspaceId: "default",
        success: false,
        error: errorMsg,
      });
    }
  }

  const overallSuccess = allSuccess && defaultWebhookSuccess;

  if (!overallSuccess) {
    const failedWorkspaces = results.filter((r) => !r.success && !r.skipped);
    logger.error("Failed to set Telegram webhook for some workspaces", {
      failedCount: failedWorkspaces.length,
      totalCount: workspaceIds.length,
      failedWorkspaces: failedWorkspaces.map((w) => ({
        workspaceId: w.workspaceId,
        error: w.error,
      })),
    });
  }

  return { success: overallSuccess, results };
}
