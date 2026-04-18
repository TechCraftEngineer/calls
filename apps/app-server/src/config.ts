/**
 * Backend server configuration.
 */

import { z } from "zod";

export const corsOrigin = process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";

export const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 7000);

// Webhook rate limiting configuration
const webhookRateLimitSchema = z.object({
  windowMs: z.coerce.number().int().positive().finite().default(60000),
  maxRequests: z.coerce.number().int().positive().finite().default(30),
});

const parsedWebhookRateLimit = webhookRateLimitSchema.safeParse({
  windowMs: process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
  maxRequests: process.env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS,
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
