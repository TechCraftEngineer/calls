import { randomUUID } from "node:crypto";
import { backendRouter, createBackendContext, createLogger } from "@calls/api";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { Hono } from "hono";
import { auth } from "../auth";

const backendLogger = createLogger("backend-server");

export const registerOrpcRoutes = (app: Hono) => {
  const rpcHandler = new RPCHandler(backendRouter, {
    interceptors: [
      onError((error) => {
        const requestId = randomUUID();
        const err = error as Error & {
          cause?: unknown;
          code?: string;
          path?: string;
        };
        backendLogger.error("oRPC Error", {
          requestId,
          message: err.message,
          code: err.code,
          path: err.path,
          cause: err.cause instanceof Error ? err.cause.message : err.cause,
        });
      }),
    ],
  });

  app.on(["GET", "POST"], "/api/orpc/*", async (c) => {
    try {
      const context = await createBackendContext({
        headers: c.req.raw.headers,
        auth,
      });
      const result = await rpcHandler.handle(c.req.raw, {
        prefix: "/api/orpc",
        context,
      });

      if (!result.matched) {
        backendLogger.warn("oRPC route not matched", {
          path: c.req.path,
          method: c.req.method,
        });
        return c.notFound();
      }

      return result.response;
    } catch (error) {
      const requestId = randomUUID();
      backendLogger.error("oRPC Handler error", {
        requestId,
        path: c.req.path,
        method: c.req.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const isDev = process.env.NODE_ENV !== "production";
      const errorResponse: Record<string, unknown> = {
        error: "Внутренняя ошибка сервера",
        requestId,
      };

      if (isDev && error instanceof Error) {
        errorResponse.message = error.message;
        errorResponse.path = c.req.path;
        errorResponse.method = c.req.method;
      }

      return c.json(errorResponse, 500);
    }
  });
};
