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
  setupTelegramWebhooks,
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

  const webhookSetupResult = await setupTelegramWebhooks();
  if (!webhookSetupResult.success) {
    backendLogger.warn(
      "Some Telegram webhooks failed to setup, but server will continue running",
      {
        failedCount: webhookSetupResult.results.filter((r) => !r.success)
          .length,
        totalCount: webhookSetupResult.results.length,
      },
    );
  } else {
    backendLogger.info("All Telegram webhooks setup successfully");
  }
})();

const app = createApp();

backendLogger.info(`Backend server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
