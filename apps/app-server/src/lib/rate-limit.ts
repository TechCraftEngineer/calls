/**
 * In-memory rate limiting middleware.
 * Temporarily disabled in main app; can be re-enabled per-route.
 */

import { createLogger } from "@calls/api";
import type { Context, Next } from "hono";

const logger = createLogger("backend-server");

export const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export function createRateLimit(options: {
  windowMs: number;
  maxRequests: number;
}) {
  return async (c: Context, next: Next) => {
    const clientIp =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const now = Date.now();
    const key = `${clientIp}:${Math.floor(now / options.windowMs)}`;

    const record = rateLimitMap.get(key);

    if (!record) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (now > record.resetTime) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      logger.warn("Rate limit exceeded", {
        ip: clientIp,
        count: record.count,
        limit: options.maxRequests,
      });
      return c.json(
        {
          detail: "Too many requests",
          retryAfter: Math.ceil(record.resetTime / 1000),
        },
        429,
      );
    }

    record.count++;
    rateLimitMap.set(key, record);
    return next();
  };
}
