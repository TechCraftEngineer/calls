/**
 * Hono app composition: middleware, routes, oRPC.
 */

import { randomUUID } from "node:crypto";
import { backendRouter, createBackendContext, createLogger } from "@calls/api";
import {
  getDefaultWorkspace,
  settingsService,
  workspacesService,
} from "@calls/db";
import { createWebhookHandler } from "@calls/telegram-bot";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { auth } from "./auth";
import { corsOrigin } from "./config";
import { rateLimitMap } from "./lib/rate-limit";
import { cleanupAllCaches } from "./lib/session-cache";

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
  cleanupInterval = setInterval(() => cleanupAllCaches(rateLimitMap), 5 * 60 * 1000);
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
if (process.env.NODE_ENV === 'test') {
  globalThis.__cleanupIntervalControl = { startCleanupInterval, stopCleanupInterval };
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
        backendLogger.error("oRPC Error", {
          message: error instanceof Error ? error.message : String(error),
          code: (error as { code?: string })?.code,
          path: (error as { path?: string })?.path,
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

  // Telegram webhook с улучшенной обработкой ошибок
  const telegramWebhookHandler = createWebhookHandler(async () => {
    try {
      const defaultWs = await getDefaultWorkspace(workspacesService);
      if (!defaultWs) {
        backendLogger.warn("Default workspace not found for telegram webhook");
        throw new Error("Default workspace not found");
      }
      const botToken = await settingsService.getDecryptedBotToken(
        "telegram_bot_token",
        defaultWs.id,
      );
      if (!botToken) {
        backendLogger.warn("Telegram bot token not configured for default workspace");
        throw new Error("Bot token not configured");
      }
      return botToken;
    } catch (error) {
      backendLogger.error("Failed to get workspace for telegram webhook", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Возвращаем null только для критических ошибок, чтобы webhook мог обработать запрос
      return null;
    }
  });
  app.post("/api/telegram-webhook", telegramWebhookHandler);

  // Health
  app.get("/", (c) => c.json({ message: "QBS Звонки API", version: "2.0.0" }));
  app.get("/health", (c) => c.json({ status: "ok" }));

  // 404
  app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

  return app;
}
