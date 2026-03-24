import { createLogger } from "@calls/api";
import { isValidWorkspaceId, settingsService } from "@calls/db";
import { createWebhookHandler } from "@calls/telegram-bot";
import type { Hono } from "hono";
import { webhookRateLimit } from "../lib/webhook-rate-limit";

const backendLogger = createLogger("backend-server");

export const registerTelegramWebhookRoutes = (app: Hono) => {
  // Telegram webhook: /api/telegram-webhook/:workspaceId (SaaS, каждый workspace — свой URL)
  app.post(
    "/api/telegram-webhook/:workspaceId",
    webhookRateLimit,
    async (c) => {
      const workspaceId = c.req.param("workspaceId");
      if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
        backendLogger.warn("Invalid workspace ID in webhook request", {
          workspaceId,
          userAgent: c.req.header("user-agent"),
          ip:
            c.req.header("x-forwarded-for") ||
            c.req.header("x-real-ip") ||
            "unknown",
        });
        return c.json({ error: "Некорректное рабочее пространство" }, 400);
      }

      const handler = createWebhookHandler(async () => {
        try {
          const { token: botToken } =
            await settingsService.getEffectiveTelegramBotToken(workspaceId);
          if (!botToken) {
            backendLogger.warn(
              "No Telegram bot token configured for workspace or system fallback",
              {
                workspaceId,
              },
            );
            return null;
          }
          return botToken;
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          backendLogger.error("Failed to get token for telegram webhook", {
            workspaceId,
            error: errorMsg,
            stack: error instanceof Error ? error.stack : undefined,
          });
          return null;
        }
      });

      try {
        return await handler(c);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        backendLogger.error("Telegram webhook handler failed", {
          workspaceId,
          error: errorMsg,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return c.json({ error: "Обработка webhook не удалась" }, 500);
      }
    },
  );

  // Общий webhook для системного Telegram-бота (fallback, если у workspace нет своего токена)
  app.post("/api/telegram-webhook-default", webhookRateLimit, async (c) => {
    const handler = createWebhookHandler(async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!token) {
        backendLogger.warn(
          "No TELEGRAM_BOT_TOKEN configured for default webhook",
        );
        return null;
      }
      return token;
    });

    try {
      return await handler(c);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      backendLogger.error("Default Telegram webhook handler failed", {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json({ error: "Обработка webhook не удалась" }, 500);
    }
  });
};
