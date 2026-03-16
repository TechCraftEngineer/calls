/**
 * Cache cleanup utilities (rate limits, etc.).
 */

/** Clear expired rate limit entries (run every 5 min). */
export function cleanupAllCaches(
  rateLimitMap: Map<string, { count: number; resetTime: number }>,
): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}
