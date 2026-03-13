/**
 * Backend Server - Hono + oRPC replacement for Python FastAPI backend.
 * Uses Better Auth for authentication.
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  backendRouter,
  createBackendApiWithContext,
  createBackendContext,
  createLogger,
} from "@calls/api";
import {
  authService,
  callsService,
  promptsService,
  usersService,
} from "@calls/db";
import { inngestHandler } from "@calls/jobs/hono";
import { createWebhookHandler } from "@calls/telegram-bot";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { sql } from "drizzle-orm";
import { Bot } from "grammy";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { rateLimit } from "hono/rate-limiter";
import { auth } from "./auth";

const backendLogger = createLogger("backend-server");

// Безопасный кэш для get-session запросов (5 секунд)
interface SessionCacheEntry {
  data: any;
  timestamp: number;
}

const sessionCache = new Map<string, SessionCacheEntry>();
// Для предотвращения race conditions
const pendingRequests = new Map<string, Promise<any>>();

// Периодическая очистка кэша каждые 30 секунд
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.timestamp > 5000) {
      sessionCache.delete(key);
    }
  }
}, 30000);

// Создание безопасного ключа кэша из cookie
function createCacheKey(cookie: string | undefined): string {
  if (!cookie) return "no-cookie";
  // Извлекаем только session ID из cookie для безопасности
  const sessionIdMatch = cookie.match(/(?:^|;\s*)session[_-]?id\s*=\s*([^;]+)/);
  if (sessionIdMatch) {
    return createHash("sha256")
      .update(sessionIdMatch[1])
      .digest("hex")
      .substring(0, 16);
  }
  // Fallback: используем хеш от всего cookie, но ограничиваем длину
  return createHash("sha256").update(cookie).digest("hex").substring(0, 16);
}

// Проверка подключения к базе данных при старте
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Надежная проверка подключения через запрос к системной таблице
    const { db } = await import("@calls/db/client");
    await db.execute(sql`SELECT 1`);
    backendLogger.info("Database connection check passed");
    return true;
  } catch (error) {
    backendLogger.error("Database connection check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new Hono();

const corsOrigin =
  process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";

// Унифицированная обработка ошибок API
function handleApiError(e: unknown, c: import("hono").Context) {
  if (e instanceof ORPCError) {
    switch (e.code) {
      case "UNAUTHORIZED":
        backendLogger.warn("Unauthorized access", {
          path: c.req.path,
          code: e.code,
        });
        return c.json({ detail: "Unauthorized" }, 401);
      case "FORBIDDEN":
        backendLogger.warn("Forbidden access", {
          path: c.req.path,
          code: e.code,
        });
        return c.json({ detail: "Forbidden" }, 403);
      case "NOT_FOUND":
        backendLogger.warn("Resource not found", {
          path: c.req.path,
          code: e.code,
        });
        return c.json({ detail: "Not found" }, 404);
      default:
        backendLogger.error("ORPC error", {
          path: c.req.path,
          code: e.code,
          message: e.message,
        });
        return c.json({ detail: "Internal server error" }, 500);
    }
  }

  if (e instanceof Error) {
    const knownErrors = [
      "User not found",
      "Call not found",
      "Not authorized",
      "Failed to delete call",
    ];

    if (knownErrors.includes(e.message)) {
      const statusCode = e.message.includes("not found")
        ? 404
        : e.message.includes("Not authorized")
          ? 403
          : 400;
      backendLogger.warn("Known error", {
        path: c.req.path,
        message: e.message,
        statusCode,
      });
      return c.json({ detail: e.message }, statusCode);
    }

    backendLogger.error("Unexpected error", {
      path: c.req.path,
      message: e.message,
      stack: e.stack,
    });
    return c.json({ detail: "Internal server error" }, 500);
  }

  backendLogger.error("Unknown error", { path: c.req.path, error: String(e) });
  return c.json({ detail: "Internal server error" }, 500);
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function _rateLimit(options: { windowMs: number; maxRequests: number }) {
  return async (c: import("hono").Context, next: () => Promise<void>) => {
    const clientIp =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    const now = Date.now();
    const windowMs = options.windowMs;
    const key = `${clientIp}:${Math.floor(now / windowMs)}`;

    const record = rateLimitMap.get(key);

    if (!record) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= options.maxRequests) {
      backendLogger.warn("Rate limit exceeded", {
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

// Очистка старых записей каждые 5 минут
setInterval(
  () => {
    const now = Date.now();
    // Очистка rate limit
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
    // Очистка кэша сессий (старше 5 минут)
    for (const [key, value] of sessionCache.entries()) {
      if (now - value.timestamp > 300000) {
        sessionCache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

app.use(honoLogger());
// Temporarily disable rate limiting to fix 429 errors
// app.use("/api/auth/*", rateLimit({ windowMs: 60 * 1000, maxRequests: 60 })); // 60 requests per minute
// app.use("/api/orpc/*", rateLimit({ windowMs: 60 * 1000, maxRequests: 300 })); // 300 requests per minute
// app.use("/api/users/*", rateLimit({ windowMs: 60 * 1000, maxRequests: 150 })); // 150 requests per minute

app.use(
  "/*",
  cors({
    origin: corsOrigin,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Static files: /api/records/:filename -> records folder
function getRecordsDir(): string {
  const isDocker =
    process.env.DEPLOYMENT_ENV === "docker" || existsSync("/.dockerenv");
  if (isDocker) return "/app/records";
  const projectRoot = resolve(__dirname, "../../..");
  return resolve(projectRoot, "records");
}

const recordsDir = getRecordsDir();
if (existsSync(recordsDir)) {
  app.use(
    "/api/records/*",
    serveStatic({
      root: recordsDir,
      rewriteRequestPath: (p) => p.replace(/^\/api\/records\/?/, ""),
    }),
  );
}

// oRPC handler
const rpcHandler = new RPCHandler(backendRouter, {
  interceptors: [
    onError((error) => {
      backendLogger.error("oRPC Error", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        path: (error as any)?.path,
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
    backendLogger.error("oRPC Handler error", {
      path: c.req.path,
      method: c.req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Безопасное возвращение информации об ошибках
    const isDev = process.env.NODE_ENV !== "production";
    const errorResponse: Record<string, any> = {
      error: "Internal Server Error",
      requestId: randomUUID(),
    };

    // В development режиме добавляем больше информации для отладки
    if (isDev && error instanceof Error) {
      errorResponse.message = error.message;
      errorResponse.path = c.req.path;
      errorResponse.method = c.req.method;
    }

    return c.json(errorResponse, 500);
  }
});

// REST compatibility: try Better Auth sign-in/username first, fallback to legacy storage during migration
app.post("/api/auth/login", async (c) => {
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
    const fields = u ? extractUserFields(u) : { givenName: "", familyName: "" };
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
  // Fallback: legacy storage (during migration from Python backend)
  const ok = await authService.verifyPassword(username, password);
  if (!ok) {
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  }
  const user = await usersService.getUserByUsername(username);
  if (!user)
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  setCookie(c, "session", username, {
    httpOnly: true,
    secure: c.req.url.startsWith("https"),
    sameSite: "Lax",
    path: "/",
    maxAge: 86400 * 7,
  });
  const u = user as Record<string, unknown>;
  const fields = extractUserFields(u);
  return c.json({
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      username: fields.username,
      name: user.name,
      givenName: fields.givenName,
      familyName: fields.familyName,
    },
  });
});

// REST compatibility: proxy legacy /api/auth/logout to Better Auth sign-out
app.post("/api/auth/logout", async (c) => {
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

// REST compatibility: /api/auth/me - delegates to backend-api
app.get("/api/auth/me", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const u = await api.auth.me();
    return c.json(u);
  } catch (e) {
    if (e instanceof ORPCError && e.code === "UNAUTHORIZED")
      return c.json({ detail: "Unauthorized" }, 401);
    throw e;
  }
});

// Middleware для безопасного кэширования get-session запросов
app.get("/api/auth/get-session", async (c) => {
  const now = Date.now();
  const cookie = c.req.header("cookie");
  const cacheKey = createCacheKey(cookie);

  // Проверяем кэш
  const cached = sessionCache.get(cacheKey);
  if (cached && now - cached.timestamp < 5000) {
    return c.json(cached.data);
  }

  // Double-checked locking для предотвращения race condition
  let pending = pendingRequests.get(cacheKey);
  if (pending) {
    try {
      const result = await pending;
      return c.json(result);
    } catch {
      // Если pending запрос упал, продолжаем с обычной логикой
      pendingRequests.delete(cacheKey);
    }
  }

  // Создаем новый запрос с очисткой в случае ошибки
  const requestPromise = (async () => {
    try {
      const authRequest = new Request(c.req.url, {
        method: c.req.method,
        headers: c.req.raw.headers,
      });

      const authResponse = await auth.handler(authRequest);
      const responseData = await authResponse.json();

      // Сохраняем в кэш только успешные ответы
      if (authResponse.status === 200) {
        sessionCache.set(cacheKey, {
          data: responseData,
          timestamp: now,
        });
      }

      return responseData;
    } finally {
      // Всегда очищаем pending запрос
      pendingRequests.delete(cacheKey);
    }
  })();

  // Повторная проверка перед установкой
  pending = pendingRequests.get(cacheKey);
  if (pending) {
    return await pending;
  }

  pendingRequests.set(cacheKey, requestPromise);

  try {
    const responseData = await requestPromise;
    return c.json(responseData);
  } catch (error) {
    pendingRequests.delete(cacheKey);
    throw error;
  }
});

// Better Auth handler для всех остальных auth эндпоинтов
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  // Пропускаем get-session, так как он обрабатывается выше
  if (c.req.path === "/api/auth/get-session") {
    return c.notFound();
  }
  return auth.handler(c.req.raw);
});

// REST: /api/calls - delegates to backend-api (main API)
app.get("/api/calls", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const page = Number(c.req.query("page")) || 1;
    const perPage = Number(c.req.query("per_page")) || 15;
    const valueRaw = c.req.query("value");
    const value = valueRaw
      ? valueRaw
          .split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n))
      : undefined;
    const operatorRaw = c.req.query("operator");
    const operator = operatorRaw
      ? operatorRaw.split(",").filter(Boolean)
      : undefined;
    const result = await api.calls.list({
      page,
      per_page: perPage,
      date_from: c.req.query("date_from"),
      date_to: c.req.query("date_to"),
      direction: c.req.query("direction"),
      value,
      operator,
      q: c.req.query("q"),
      status: c.req.query("status"),
      manager: c.req.query("manager"),
    });
    return c.json(result);
  } catch (e) {
    if (e instanceof ORPCError) {
      if (e.code === "UNAUTHORIZED")
        return c.json({ detail: "Unauthorized" }, 401);
      if (e.code === "FORBIDDEN") return c.json({ detail: "Forbidden" }, 403);
    }
    throw e;
  }
});

app.get("/api/calls/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.calls.get({ call_id: id });
    return c.json(result);
  } catch (e) {
    if (e instanceof ORPCError) {
      if (e.code === "UNAUTHORIZED")
        return c.json({ detail: "Unauthorized" }, 401);
    }
    if (e instanceof Error && e.message === "Call not found")
      return c.json({ detail: "Call not found" }, 404);
    throw e;
  }
});

app.post("/api/calls/:id/recommendations", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = await callsService.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = await callsService.getTranscriptByCallId(id);
  if (!transcript?.text)
    return c.json({ detail: "Transcript not found for this call" }, 400);
  return c.json({ detail: "DeepSeek recommendations not yet integrated" }, 501);
});

app.post("/api/calls/:id/evaluate", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = await callsService.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = await callsService.getTranscriptByCallId(id);
  if (!transcript?.text)
    return c.json(
      { detail: "Transcript not found. Please transcribe the call first." },
      400,
    );
  return c.json({ detail: "DeepSeek evaluation not yet integrated" }, 501);
});

app.delete("/api/calls/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.calls.delete({ call_id: id });
    return c.json(result);
  } catch (e) {
    if (e instanceof ORPCError) {
      if (e.code === "UNAUTHORIZED")
        return c.json({ detail: "Unauthorized" }, 401);
      if (e.code === "FORBIDDEN") return c.json({ detail: "Forbidden" }, 403);
    }
    if (e instanceof Error) {
      if (e.message === "Call not found")
        return c.json({ detail: "Call not found" }, 404);
      if (e.message === "Failed to delete call")
        return c.json({ detail: "Failed to delete call" }, 500);
    }
    throw e;
  }
});

// REST: /api/users - delegates to backend-api
app.get("/api/users", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const list = await api.users.list();
    return c.json(list);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.post("/api/users", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const body = await c.req.json<{
    username: string;
    password: string;
    givenName: string;
    familyName?: string;
    internalExtensions?: string;
    mobilePhones?: string;
  }>();
  if (!body.username || !body.password || !body.givenName)
    return c.json(
      { detail: "Username, password, and given name are required" },
      400,
    );
  try {
    const api = createBackendApiWithContext(ctx);
    const user = await api.users.create({
      username: body.username,
      password: body.password,
      givenName: body.givenName,
      familyName: body.familyName ?? "",
      internalExtensions: body.internalExtensions ?? null,
      mobilePhones: body.mobilePhones ?? null,
    });
    return c.json(user);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    return c.json({ detail: e instanceof Error ? e.message : String(e) }, 400);
  }
});

app.get("/api/users/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const user = await api.users.get({ user_id: id });
    return c.json(user);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.put("/api/users/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const body = await c.req.json<Record<string, unknown>>();
  try {
    const api = createBackendApiWithContext(ctx);
    const updated = await api.users.update({ user_id: id, data: body });
    return c.json(updated);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    return c.json({ detail: e instanceof Error ? e.message : String(e) }, 400);
  }
});

app.delete("/api/users/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.users.delete({ user_id: id });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    return c.json(
      {
        detail:
          e instanceof Error ? e.message : "Cannot delete your own account",
      },
      400,
    );
  }
});

app.post("/api/users/:id/change-password", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{
    new_password: string;
    confirm_password: string;
  }>();
  if (!body.new_password)
    return c.json({ detail: "Password cannot be empty" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.users.changePassword({
      user_id: id,
      new_password: body.new_password,
      confirm_password: body.confirm_password,
    });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    return c.json({ detail: e instanceof Error ? e.message : String(e) }, 400);
  }
});

app.post("/api/users/:id/telegram-auth-url", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.users.telegramAuthUrl({ user_id: id });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.delete("/api/users/:id/telegram", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.users.disconnectTelegram({ user_id: id });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.post("/api/users/:id/max-auth-url", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.users.maxAuthUrl({ user_id: id });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.delete("/api/users/:id/max", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.users.disconnectMax({ user_id: id });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

// REST: /api/settings - delegates to backend-api
app.get("/api/settings/prompts", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const prompts = await api.settings.getPrompts();
    return c.json(prompts);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.put("/api/settings/prompts", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  const body = await c.req.json<{
    prompts?: Record<string, { value?: string; description?: string }>;
  }>();
  try {
    const api = createBackendApiWithContext(ctx);
    await api.settings.updatePrompts({ prompts: body.prompts } as Record<
      string,
      unknown
    >);
    return c.json({ success: true, message: "Settings updated successfully" });
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.get("/api/settings/models", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.settings.getModels();
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.post("/api/settings/backup", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.settings.backup();
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    return c.json({ detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// REST: /api/statistics, /api/metrics - delegates to backend-api
app.get("/api/statistics", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.statistics.getStatistics({
      date_from: c.req.query("date_from"),
      date_to: c.req.query("date_to"),
      sort: c.req.query("sort"),
      order: c.req.query("order"),
    });
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

app.get("/api/metrics", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    const result = await api.statistics.getMetrics();
    return c.json(result);
  } catch (e) {
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

// REST: /api/reports - delegates to backend-api
app.post("/api/reports/send-test-telegram", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  try {
    const api = createBackendApiWithContext(ctx);
    await api.reports.sendTestTelegram();
    return c.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Telegram"))
      return c.json({ detail: e.message }, 501);
    const err = handleApiError(e, c);
    if (err) return err;
    throw e;
  }
});

// Telegram webhook - for /start linking and incoming updates
const telegramWebhookHandler = createWebhookHandler(() =>
  promptsService.getPrompt("telegram_bot_token"),
);
app.post("/api/telegram-webhook", telegramWebhookHandler);

// Inngest - cron и фоновые задачи (Megafon FTP sync и др.)
app.on(["GET", "PUT", "POST"], "/api/inngest", inngestHandler);

// Health
app.get("/", (c) => c.json({ message: "QBS Звонки API", version: "2.0.0" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// 404
app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 7000);

// Set Telegram webhook on startup when configured
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
async function setupTelegramWebhook(): Promise<boolean> {
  if (!webhookUrl) {
    backendLogger.info(
      "TELEGRAM_WEBHOOK_URL not configured, skipping webhook setup",
    );
    return true; // Не ошибка, просто не настроено
  }

  const maxRetries = 3;
  const retryDelay = 5000; // 5 секунд

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const token = await promptsService.getPrompt("telegram_bot_token");
      if (!token?.trim()) {
        backendLogger.warn(
          "Telegram bot token not configured, skipping webhook setup",
        );
        return true; // Не ошибка, просто не настроено
      }

      const bot = new Bot(token);
      const webhookInfo = await bot.api.getWebhookInfo();

      // Устанавливаем webhook только если он отличается от текущего
      if (webhookInfo.url !== webhookUrl) {
        await bot.api.setWebhook(webhookUrl);
        backendLogger.info("Telegram webhook set successfully", {
          url: webhookUrl,
          attempt,
        });
      } else {
        backendLogger.info("Telegram webhook already configured");
      }

      return true; // Успешно
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      backendLogger.error(
        `Failed to set Telegram webhook (attempt ${attempt}/${maxRetries})`,
        {
          error: errorMsg,
          url: webhookUrl,
          attempt,
        },
      );

      if (attempt < maxRetries) {
        backendLogger.info(
          `Retrying webhook setup in ${retryDelay / 1000} seconds...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Если все попытки неудачны
  backendLogger.error("Failed to set Telegram webhook after all retries", {
    url: webhookUrl,
    maxRetries,
  });

  return false; // Критическая ошибка
}

// Запускаем setup webhook асинхронно с обработкой результата
(async () => {
  // Сначала проверяем подключение к БД
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    backendLogger.error(
      "Failed to connect to database - server may not function properly",
    );
  }

  const webhookSetupSuccess = await setupTelegramWebhook();
  if (!webhookSetupSuccess) {
    backendLogger.warn(
      "Telegram webhook setup failed, but server will continue running",
    );
  }
})();

backendLogger.info(`Backend server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
