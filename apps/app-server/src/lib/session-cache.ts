/**
 * Session cache for get-session requests (5 second TTL).
 * Prevents duplicate auth requests for the same session.
 */

import { createHash } from "node:crypto";

export interface SessionCacheEntry {
  data: unknown;
  timestamp: number;
}

export const sessionCache = new Map<string, SessionCacheEntry>();
export const pendingRequests = new Map<string, Promise<unknown>>();

/** Create a safe cache key from cookie (hashed session ID only). */
export function createCacheKey(cookie: string | undefined): string {
  if (!cookie) return "no-cookie";
  const sessionIdMatch = cookie.match(
    /(?:^|;\s*)session[_-]?id\s*=\s*([a-zA-Z0-9_-]+)/,
  );
  const sessionId = sessionIdMatch?.[1];
  if (sessionId) {
    return createHash("sha256")
      .update(sessionId)
      .digest("hex")
      .substring(0, 16);
  }
  return createHash("sha256").update(cookie).digest("hex").substring(0, 16);
}

/** Clear expired entries from session cache (run every 30s). */
export function cleanupSessionCache(): void {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.timestamp > 5000) {
      sessionCache.delete(key);
    }
  }
}

/** Clear expired rate limit and session entries (run every 5 min). */
export function cleanupAllCaches(
  rateLimitMap: Map<string, { count: number; resetTime: number }>,
): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp > 5000) {
      sessionCache.delete(key);
    }
  }
}
