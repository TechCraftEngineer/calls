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

import { inngestHandler } from "./hono";

const app = new Hono();

app.on(["GET", "PUT", "POST"], "/api/inngest", inngestHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.JOBS_PORT) || 8000;

export default {
  port,
  fetch: app.fetch,
};
