/**
 * Hono app composition: middleware, routes, oRPC.
 */

import { randomUUID } from "node:crypto";
import { backendRouter, createBackendContext, createLogger } from "@calls/api";
import { isValidWorkspaceId, settingsService } from "@calls/db";
import { createWebhookHandler } from "@calls/telegram-bot";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { auth } from "./auth";
import { corsOrigin } from "./config";
import { createRateLimit, rateLimitMap } from "./lib/rate-limit";
import { cleanupAllCaches } from "./lib/session-cache";

// Rate limiting для webhook endpoints (защита от DoS)
const webhookRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 30, // максимум 30 запросов в минуту на IP
});

// Экспортируем функции для управления интервалом (для тестов)
interface CleanupIntervalControl {
  startCleanupInterval: () => void;
  stopCleanupInterval: () => void;
}

declare global {
  var __cleanupIntervalControl: CleanupIntervalControl | undefined;
}

const backendLogger = createLogger("backend-server");

// Cache cleanup interval for rate limits
let cleanupInterval: NodeJS.Timeout | null = null;

const startCleanupInterval = () => {
  if (cleanupInterval) return; // Предотвращаем дублирование интервалов
  cleanupInterval = setInterval(
    () => cleanupAllCaches(rateLimitMap),
    5 * 60 * 1000,
  );
};

const stopCleanupInterval = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Запускаем интервал при старте приложения
startCleanupInterval();

// Устанавливаем глобальный контроль для тестов
if (process.env.NODE_ENV === "test") {
  globalThis.__cleanupIntervalControl = {
    startCleanupInterval,
    stopCleanupInterval,
  };
}

export function createApp() {
  const app = new Hono();

  app.use(honoLogger());
  app.use(
    "/*",
    cors({
      origin: corsOrigin,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  // oRPC handler
  const rpcHandler = new RPCHandler(backendRouter, {
    interceptors: [
      onError((error) => {
        const err = error as Error & {
          cause?: unknown;
          code?: string;
          path?: string;
        };
        backendLogger.error("oRPC Error", {
          message: err.message,
          code: err.code,
          path: err.path,
          cause: err.cause instanceof Error ? err.cause.message : err.cause,
        });
      }),
    ],
  });

  app.on(["GET", "POST"], "/api/orpc/*", async (c) => {
    try {
      const context = await createBackendContext({
        headers: c.req.raw.headers,
        auth,
      });
      const result = await rpcHandler.handle(c.req.raw, {
        prefix: "/api/orpc",
        context,
      });

      if (!result.matched) {
        backendLogger.warn("oRPC route not matched", {
          path: c.req.path,
          method: c.req.method,
        });
        return c.notFound();
      }

      return result.response;
    } catch (error) {
      backendLogger.error("oRPC Handler error", {
        path: c.req.path,
        method: c.req.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const isDev = process.env.NODE_ENV !== "production";
      const errorResponse: Record<string, unknown> = {
        error: "Internal Server Error",
        requestId: randomUUID(),
      };

      if (isDev && error instanceof Error) {
        errorResponse.message = error.message;
        errorResponse.path = c.req.path;
        errorResponse.method = c.req.method;
      }

      return c.json(errorResponse, 500);
    }
  });

  // Better Auth handler for /api/auth/* (sign-in, sign-out, get-session, callbacks)
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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
        return c.json({ error: "Invalid workspace" }, 400);
      }

      const handler = createWebhookHandler(async () => {
        try {
          const botToken = await settingsService.getDecryptedBotToken(
            "telegram_bot_token",
            workspaceId,
          );
          if (!botToken) {
            backendLogger.warn(
              "No Telegram bot token configured for workspace",
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
        return c.json({ error: "Webhook processing failed" }, 500);
      }
    },
  );

  // Health
  app.get("/", (c) => c.json({ message: "QBS Звонки API", version: "2.0.0" }));
  app.get("/health", (c) => c.json({ status: "ok" }));

  // 404
  app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

  return app;
}
