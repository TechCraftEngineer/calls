/**
 * Backend server configuration.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

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
const webhookRateLimitSchema = z.object({
  windowMs: z.number().int().positive().finite().default(60000),
  maxRequests: z.number().int().positive().finite().default(30),
});

const parsedWebhookRateLimit = webhookRateLimitSchema.safeParse({
  windowMs: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  maxRequests: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS ?? "30", 10),
});

if (!parsedWebhookRateLimit.success) {
  console.error(
    "Invalid WEBHOOK_RATE_LIMIT environment variables. Using safe defaults.",
    parsedWebhookRateLimit.error.format(),
  );
}

export const webhookRateLimitConfig = parsedWebhookRateLimit.success
  ? parsedWebhookRateLimit.data
  : {
      windowMs: 60000,
      maxRequests: 30,
    };
