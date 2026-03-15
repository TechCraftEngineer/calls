/**
 * Hono app composition: middleware, routes, oRPC.
 */

import { randomUUID } from "node:crypto";
import { backendRouter, createBackendContext, createLogger } from "@calls/api";
import {
  getDefaultWorkspace,
  promptsService,
  workspacesService,
} from "@calls/db";
import { inngestHandler } from "@calls/jobs/hono";
import { createWebhookHandler } from "@calls/telegram-bot";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { auth } from "./auth";
import { corsOrigin } from "./config";
import { rateLimitMap } from "./lib/rate-limit";
import { cleanupAllCaches, cleanupSessionCache } from "./lib/session-cache";
import { createAuthRoutes } from "./routes/auth";

const backendLogger = createLogger("backend-server");

// Cache cleanup intervals
setInterval(cleanupSessionCache, 30000);
setInterval(() => cleanupAllCaches(rateLimitMap), 5 * 60 * 1000);

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

  // REST routes
  app.route("/api/auth", createAuthRoutes(auth));

  // Better Auth handler for remaining /api/auth/* endpoints
  app.on(["GET", "POST"], "/api/auth/*", (c) => {
    if (c.req.path === "/api/auth/get-session") {
      return c.notFound();
    }
    return auth.handler(c.req.raw);
  });

  // Telegram webhook
  const telegramWebhookHandler = createWebhookHandler(async () => {
    try {
      const defaultWs = await getDefaultWorkspace(workspacesService);
      if (!defaultWs) {
        backendLogger.warn("Default workspace not found for telegram webhook");
        return null;
      }
      return promptsService.getPrompt("telegram_bot_token", defaultWs.id);
    } catch (error) {
      backendLogger.error("Failed to get workspace for telegram webhook", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  });
  app.post("/api/telegram-webhook", telegramWebhookHandler);

  // Inngest
  app.on(["GET", "PUT", "POST"], "/api/inngest", inngestHandler);

  // Health
  app.get("/", (c) => c.json({ message: "QBS Звонки API", version: "2.0.0" }));
  app.get("/health", (c) => c.json({ status: "ok" }));

  // 404
  app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

  return app;
}
