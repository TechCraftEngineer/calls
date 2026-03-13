/**
 * Backend Server - Hono + oRPC replacement for Python FastAPI backend.
 * Uses Better Auth for authentication.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  backendRouter,
  createBackendApiWithContext,
  createBackendContext,
} from "@calls/api";
import { storage } from "@calls/db";
import { createWebhookHandler } from "@calls/telegram-bot";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Bot } from "grammy";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new Hono();

const corsOrigin =
  process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";

app.use(logger());
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
      console.error("[Backend oRPC] Error:", error);
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
      return c.notFound();
    }

    return result.response;
  } catch (error) {
    console.error("[Backend oRPC] Handler error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
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
      user?: { id: string; name?: string; username?: string };
    };
    const headers = new Headers();
    authResponse.headers.forEach((v, k) => {
      if (k.toLowerCase() === "set-cookie") headers.append(k, v);
    });
    return c.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: data.user?.id,
          username: data.user?.username ?? username,
          name: data.user?.name ?? username,
          first_name: "",
          last_name: "",
        },
      },
      200,
      Object.fromEntries(headers.entries()) as Record<string, string>,
    );
  }
  // Fallback: legacy storage (during migration from Python backend)
  const ok = await storage.verifyPassword(username, password);
  if (!ok) {
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  }
  const user = await storage.getUserByUsername(username);
  if (!user)
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  setCookie(c, "session", username, {
    httpOnly: true,
    secure: c.req.url.startsWith("https"),
    sameSite: "Lax",
    path: "/",
    maxAge: 86400 * 7,
  });
  return c.json({
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      first_name: (user as Record<string, unknown>).first_name ?? "",
      last_name: (user as Record<string, unknown>).last_name ?? "",
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
  const headers = new Headers();
  authResponse.headers.forEach((v, k) => {
    if (k.toLowerCase() === "set-cookie") headers.append(k, v);
  });
  return c.json(
    { success: true, message: "Logged out" },
    200,
    Object.fromEntries(headers.entries()) as Record<string, string>,
  );
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

// Better Auth handler for sign-in/username, sign-out, get-session, etc.
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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
  const call = await storage.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = await storage.getTranscriptByCallId(id);
  if (!transcript?.text)
    return c.json({ detail: "Transcript not found for this call" }, 400);
  return c.json({ detail: "DeepSeek recommendations not yet integrated" }, 501);
});

app.post("/api/calls/:id/evaluate", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers, auth });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = await storage.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = await storage.getTranscriptByCallId(id);
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
function handleApiError(e: unknown, c: import("hono").Context) {
  if (e instanceof ORPCError) {
    if (e.code === "UNAUTHORIZED")
      return c.json({ detail: "Unauthorized" }, 401);
    if (e.code === "FORBIDDEN") return c.json({ detail: "Forbidden" }, 403);
  }
  if (e instanceof Error) {
    if (e.message === "User not found" || e.message === "Call not found")
      return c.json({ detail: e.message }, 404);
    if (e.message === "Not authorized")
      return c.json({ detail: e.message }, 403);
  }
  return null;
}

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
    first_name: string;
    last_name?: string;
    internal_numbers?: string;
    mobile_numbers?: string;
  }>();
  if (!body.username || !body.password || !body.first_name)
    return c.json(
      { detail: "Username, password, and first name are required" },
      400,
    );
  try {
    const api = createBackendApiWithContext(ctx);
    const user = await api.users.create({
      username: body.username,
      password: body.password,
      first_name: body.first_name,
      last_name: body.last_name ?? "",
      internal_numbers: body.internal_numbers ?? null,
      mobile_numbers: body.mobile_numbers ?? null,
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
  storage.getPrompt("telegram_bot_token"),
);
app.post("/api/telegram-webhook", telegramWebhookHandler);

// Health
app.get("/", (c) => c.json({ message: "QBS Звонки API", version: "2.0.0" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// 404
app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 8000);

// Set Telegram webhook on startup when configured
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
async function setupTelegramWebhook() {
  if (!webhookUrl) {
    console.log(
      "[backend-server] TELEGRAM_WEBHOOK_URL not configured, skipping webhook setup",
    );
    return;
  }

  try {
    const token = await storage.getPrompt("telegram_bot_token");
    if (!token?.trim()) {
      console.warn(
        "[backend-server] Telegram bot token not configured, skipping webhook setup",
      );
      return;
    }

    const bot = new Bot(token);
    const webhookInfo = await bot.api.getWebhookInfo();

    // Устанавливаем webhook только если он отличается от текущего
    if (webhookInfo.url !== webhookUrl) {
      await bot.api.setWebhook(webhookUrl);
      console.log("[backend-server] Telegram webhook set successfully");
    } else {
      console.log("[backend-server] Telegram webhook already configured");
    }
  } catch (error) {
    console.error("[backend-server] Failed to set Telegram webhook:", error);
    // В случае критической ошибки webhook setup не должно прерывать запуск сервера
    // Но логируем проблему для диагностики
  }
}

// Запускаем setup webhook асинхронно, но не блокируем запуск сервера
setupTelegramWebhook();

console.log(`[backend-server] Running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
