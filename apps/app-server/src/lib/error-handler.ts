/**
 * Unified API error handling.
 */

import { createLogger } from "@calls/api";
import { ORPCError } from "@orpc/server";
import type { Context } from "hono";

const logger = createLogger("backend-server");

const KNOWN_ERRORS = [
  "User not found",
  "Call not found",
  "Not authorized",
  "Failed to delete call",
] as const;

export function handleApiError(e: unknown, c: Context): Response | undefined {
  if (e instanceof ORPCError) {
    switch (e.code) {
      case "UNAUTHORIZED":
        logger.warn("Unauthorized access", { path: c.req.path, code: e.code });
        return c.json({ detail: "Unauthorized" }, 401);
      case "FORBIDDEN":
        logger.warn("Forbidden access", { path: c.req.path, code: e.code });
        return c.json({ detail: "Forbidden" }, 403);
      case "NOT_FOUND":
        logger.warn("Resource not found", { path: c.req.path, code: e.code });
        return c.json({ detail: "Not found" }, 404);
      default:
        logger.error("ORPC error", {
          path: c.req.path,
          code: e.code,
          message: e.message,
        });
        return c.json({ detail: "Internal server error" }, 500);
    }
  }

  if (e instanceof Error) {
    if (KNOWN_ERRORS.includes(e.message as (typeof KNOWN_ERRORS)[number])) {
      const statusCode = e.message.includes("not found")
        ? 404
        : e.message.includes("Not authorized")
          ? 403
          : 400;
      logger.warn("Known error", {
        path: c.req.path,
        message: e.message,
        statusCode,
      });
      return c.json({ detail: e.message }, statusCode);
    }

    logger.error("Unexpected error", {
      path: c.req.path,
      message: e.message,
      stack: e.stack,
    });
    return c.json({ detail: "Internal server error" }, 500);
  }

  logger.error("Unknown error", { path: c.req.path, error: String(e) });
  return c.json({ detail: "Internal server error" }, 500);
}
