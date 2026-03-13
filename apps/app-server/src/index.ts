/**
 * Backend Server - Hono + oRPC replacement for Python FastAPI backend.
 * Uses Better Auth for authentication.
 */

import { createLogger } from "@calls/api";
import { createApp } from "./app";
import { port } from "./config";
import { checkDatabaseConnection } from "./lib/db";
import { setupTelegramWebhook } from "./startup/telegram-webhook";

const backendLogger = createLogger("backend-server");

(async () => {
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    backendLogger.error(
      "Failed to connect to database - server may not function properly",
    );
  }

  const webhookSetupSuccess = await setupTelegramWebhook();
  if (!webhookSetupSuccess) {
    backendLogger.warn(
      "Telegram webhook setup failed, but server will continue running",
    );
  }
})();

const app = createApp();

backendLogger.info(`Backend server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
