/**
 * Backend oRPC context and procedures.
 * Uses cookie-based session (session=username) compatible with Python backend.
 */

import { storage } from "@acme/backend-storage";
import { ORPCError, os } from "@orpc/server";

function getSessionFromCookie(headers: Headers): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/\bsession=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function createBackendContext(opts: { headers: Headers }) {
  const sessionUsername = getSessionFromCookie(opts.headers);
  let user: Awaited<ReturnType<typeof storage.getUserByUsername>> = null;
  if (sessionUsername) {
    user = storage.getUserByUsername(sessionUsername);
  }

  return {
    storage,
    sessionUsername,
    user,
  };
}

type BackendContext = Awaited<ReturnType<typeof createBackendContext>>;

const o = os.$context<BackendContext>();

const timingMiddleware = o.middleware(async ({ next, path }) => {
  const start = Date.now();
  try {
    return await next();
  } finally {
    console.log(`[Backend oRPC] ${path} took ${Date.now() - start}ms`);
  }
});

export const publicProcedure = o.use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: { ...context, user: context.user },
  });
});

function isAdmin(user: Record<string, unknown>): boolean {
  const un = user.username as string;
  const inn = user.internal_numbers as string;
  return un === "admin@mango" || un === "admin@gmail.com" || String(inn ?? "").trim().toLowerCase() === "all";
}

export const adminProcedure = protectedProcedure.use(({ context, next }) => {
  if (!isAdmin(context.user as Record<string, unknown>)) {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});
