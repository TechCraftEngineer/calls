/**
 * Hono app composition: middleware + route registration.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { corsOrigin } from "./config";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthRoutes } from "./routes/health";
import { registerOrpcRoutes } from "./routes/orpc";
import { registerPbxWebhookRoutes } from "./routes/pbx-webhook";
import { registerTelegramWebhookRoutes } from "./routes/telegram-webhook";
import { ensureCleanupIntervalStarted } from "./startup/rate-limit-cleanup";

// Запускаем интервал при старте приложения (включая глобальный контроль для тестов).
ensureCleanupIntervalStarted();

export function createApp() {
  const app = new Hono();

  app.use(honoLogger());
  app.use(
    "/*",
    cors({
      origin: corsOrigin,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-Workspace-Id"],
      credentials: true,
    }),
  );

  registerOrpcRoutes(app);
  registerAuthRoutes(app);
  registerTelegramWebhookRoutes(app);
  registerPbxWebhookRoutes(app);
  registerHealthRoutes(app);

  // 404
  app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

  return app;
}
