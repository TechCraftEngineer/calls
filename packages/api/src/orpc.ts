/**
 * Backend oRPC context and procedures.
 * Uses Better Auth for session; enriches with backend user profile.
 */

import { storage } from "@calls/db";
import { ORPCError, os } from "@orpc/server";
import { isAdminUser } from "./user-profile";

export type AuthLike = {
  api: {
    getSession: (opts: {
      headers: Headers;
    }) => Promise<{ user?: Record<string, unknown>; session?: unknown } | null>;
  };
};

export async function createBackendContext(opts: {
  headers: Headers;
  auth?: AuthLike;
}) {
  let user: Awaited<ReturnType<typeof storage.getUserByUsername>> | null = null;

  if (opts.auth) {
    const session = await opts.auth.api.getSession({ headers: opts.headers });
    if (session?.user) {
      const baUser = session.user as Record<string, unknown>;
      const username = (baUser.username ?? baUser.email ?? baUser.name) as
        | string
        | undefined;
      if (username) {
        const profile = await storage.getUserByUsername(username);
        user = profile
          ? ({ ...profile, ...baUser } as Awaited<
              ReturnType<typeof storage.getUserByUsername>
            >)
          : (baUser as Awaited<ReturnType<typeof storage.getUserByUsername>>);
      }
    }
  }

  if (!user) {
    const cookie = opts.headers.get("cookie");
    const match = cookie?.match(/\bsession=([^;]+)/);
    const sessionUsername = match?.[1]
      ? decodeURIComponent(match[1].trim())
      : null;
    if (sessionUsername) {
      user = await storage.getUserByUsername(sessionUsername);
    }
  }

  return {
    storage,
    sessionUsername: user?.username ?? null,
    user,
  };
}

export type BackendContext = Awaited<ReturnType<typeof createBackendContext>>;

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

export const adminProcedure = protectedProcedure.use(({ context, next }) => {
  if (!isAdminUser(context.user as Record<string, unknown>)) {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});
