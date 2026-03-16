/**
 * Main app module - loaded after Langfuse tracing initialization.
 * Exports app factory and dependencies for the server entry point.
 */

export { createLogger } from "@calls/api";
export { createApp } from "./app";
export { port } from "./config";
export { checkDatabaseConnection } from "./lib/db";
export type { SetupTelegramWebhooksResult } from "./startup/telegram-webhook";
export { setupTelegramWebhooks } from "./startup/telegram-webhook";
