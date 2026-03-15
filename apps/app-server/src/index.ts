/**
 * Backend Server - Hono + oRPC replacement for Python FastAPI backend.
 * Uses Better Auth for authentication.
 *
 * IMPORTANT: Langfuse tracing must be initialized BEFORE any code that uses AI SDK.
 * We use dynamic import for the app so that @calls/api (which pulls in @calls/ai) is loaded
 * only after the OpenTelemetry provider is registered.
 */

import { initializeLangfuseTracing } from "@calls/ai/instrumentation";

initializeLangfuseTracing();

const {
  createApp,
  port,
  checkDatabaseConnection,
  setupTelegramWebhook,
  createLogger,
} = await import("./main");

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
