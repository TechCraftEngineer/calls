/**
 * Standalone Inngest worker server.
 * Запуск: bun run start
 *
 * Exposes /api/inngest for Inngest Cloud / Dev Server to invoke job functions.
 *
 * IMPORTANT: Langfuse tracing must be initialized BEFORE any code that uses AI SDK.
 * Import from @calls/ai/instrumentation (not @calls/ai) to avoid loading AI SDK before provider registration.
 */

import { initializeLangfuseTracing } from "@calls/ai/instrumentation";
import { Hono } from "hono";

initializeLangfuseTracing();

import { inngestHandler } from "./inngest-handler";

const app = new Hono();

app.on(["GET", "PUT", "POST"], "/api/inngest", inngestHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.JOBS_PORT) || 8000;

const server = Bun.serve({
  port,
  fetch: app.fetch.bind(app),
});

console.log(`🚀 Jobs server running at http://localhost:${port}`);

// Graceful shutdown handling for Kubernetes SIGTERM
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.stop(true);

  // Give ongoing Inngest functions time to complete (up to 25s for checkpointing maxRuntime)
  const shutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 25000;

  setTimeout(() => {
    console.log("Graceful shutdown complete");
    process.exit(0);
  }, shutdownTimeout);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default server;
