/**
 * Auth routes: login, logout, me, get-session.
 */

import {
  createBackendApiWithContext,
  createBackendContext,
  extractUserFields,
} from "@calls/api";
import { ORPCError } from "@orpc/server";
import { Hono } from "hono";
import type { Auth } from "../auth";
import {
  createCacheKey,
  pendingRequests,
  sessionCache,
} from "../lib/session-cache";

export function createAuthRoutes(auth: Auth) {
  const r = new Hono();

  r.post("/login", async (c) => {
    const body = await c.req.json<{ username: string; password: string }>();
    const username = (body.username ?? "").trim();
    const password = (body.password ?? "").trim();
    if (!username || !password) {
      return c.json({ success: false, detail: "Invalid credentials" }, 401);
    }

    const authUrl = new URL(c.req.url).origin;
    const authRequest = new Request(`${authUrl}/api/auth/sign-in/username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: c.req.header("Cookie") ?? "",
      },
      body: JSON.stringify({ username, password }),
    });
    const authResponse = await auth.handler(authRequest);

    if (authResponse.status === 200) {
      const data = (await authResponse.json()) as {
        user?: {
          id: string;
          name?: string;
          username?: string;
          givenName?: string;
          familyName?: string;
        };
      };
      const headersObj: Record<string, string> = {};
      authResponse.headers.forEach((v, k) => {
        if (k.toLowerCase() === "set-cookie") headersObj[k] = v;
      });
      const u = data.user;
      const fields = u
        ? extractUserFields(u)
        : { givenName: "", familyName: "" };
      return c.json(
        {
          success: true,
          message: "Login successful",
          user: {
            id: u?.id,
            username: u?.username ?? username,
            name: u?.name ?? username,
            givenName: fields.givenName,
            familyName: fields.familyName,
          },
        },
        200,
        headersObj,
      );
    }

    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  });

  r.post("/logout", async (c) => {
    const authUrl = new URL(c.req.url).origin;
    const authRequest = new Request(`${authUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: { Cookie: c.req.header("Cookie") ?? "" },
    });
    const authResponse = await auth.handler(authRequest);
    const headersObj: Record<string, string> = {};
    authResponse.headers.forEach((v, k) => {
      if (k.toLowerCase() === "set-cookie") headersObj[k] = v;
    });
    return c.json({ success: true, message: "Logged out" }, 200, headersObj);
  });

  r.get("/me", async (c) => {
    const ctx = await createBackendContext({
      headers: c.req.raw.headers,
      auth,
    });
    try {
      const api = createBackendApiWithContext(ctx);
      const u = await api.auth.me();
      return c.json(u);
    } catch (e) {
      if (e instanceof ORPCError && e.code === "UNAUTHORIZED") {
        return c.json({ detail: "Unauthorized" }, 401);
      }
      throw e;
    }
  });

  r.get("/get-session", async (c) => {
    const now = Date.now();
    const cookie = c.req.header("cookie");
    const cacheKey = createCacheKey(cookie);

    const cached = sessionCache.get(cacheKey);
    if (cached && now - cached.timestamp < 5000) {
      return c.json(cached.data);
    }

    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      try {
        const result = await pending;
        return c.json(result);
      } catch {
        pendingRequests.delete(cacheKey);
      }
    }

    const requestPromise = (async () => {
      try {
        const authRequest = new Request(c.req.url, {
          method: c.req.method,
          headers: c.req.raw.headers,
        });
        const authResponse = await auth.handler(authRequest);
        const responseData = await authResponse.json();

        if (authResponse.status === 200) {
          sessionCache.set(cacheKey, { data: responseData, timestamp: now });
        }
        return responseData;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);

    try {
      const responseData = await requestPromise;
      return c.json(responseData);
    } catch (error) {
      pendingRequests.delete(cacheKey);
      throw error;
    }
  });

  return r;
}
