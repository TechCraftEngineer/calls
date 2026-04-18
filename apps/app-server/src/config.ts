/**
 * Backend server configuration.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const corsOrigin = process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";

export const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 7000);

export function getRecordsDir(): string {
  const isDocker = process.env.DEPLOYMENT_ENV === "docker" || existsSync("/.dockerenv");
  if (isDocker) return "/app/records";
  const projectRoot = resolve(__dirname, "../../..");
  return resolve(projectRoot, "records");
}

// Webhook rate limiting configuration
export const webhookRateLimitConfig = {
  // Window in milliseconds (default: 1 minute)
  windowMs: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  // Max requests per window (default: 30)
  maxRequests: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS ?? "30", 10),
};
