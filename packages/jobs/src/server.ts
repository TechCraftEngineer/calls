/**
 * Standalone Inngest worker server.
 * Запуск: bun run start
 *
 * Exposes /api/inngest for Inngest Cloud / Dev Server to invoke job functions.
 */

import { initializeLangfuseTracing } from "@calls/ai";
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
