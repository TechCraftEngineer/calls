/**
 * Backend Server - Hono + oRPC replacement for Python FastAPI backend.
 * Serves the calls/transcription app API on port 8000 (or BACKEND_PORT).
 */

import { backendRouter, createBackendContext } from "@acme/backend-api";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/serve-static";
import { resolve } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new Hono();

const corsOrigin = process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";

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
  const isDocker = process.env.DEPLOYMENT_ENV === "docker" || existsSync("/.dockerenv");
  if (isDocker) return "/app/records";
  const projectRoot = resolve(__dirname, "../../..");
  return resolve(projectRoot, "records");
}

const recordsDir = getRecordsDir();
if (existsSync(recordsDir)) {
  app.use("/api/records/*", serveStatic({ root: recordsDir, rewriteRequestPath: (p) => p.replace(/^\/api\/records\/?/, "") }));
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
    const context = await createBackendContext({ headers: c.req.raw.headers });
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

// REST endpoints for backward compatibility during migration
// Frontend uses REST - these mirror the Python backend API until frontend migrates to oRPC client.

import { setCookie, deleteCookie } from "hono/cookie";
import { storage } from "@acme/backend-storage";

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json<{ username: string; password: string }>();
  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!username || !password) {
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  }
  const ok = storage.verifyPassword(username, password);
  if (!ok) {
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  }
  const user = storage.getUserByUsername(username);
  if (!user) {
    return c.json({ success: false, detail: "Invalid credentials" }, 401);
  }
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

app.post("/api/auth/logout", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ success: true, message: "Logged out" });
});

app.get("/api/auth/me", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) {
    return c.json({ detail: "Unauthorized" }, 401);
  }
  const u = ctx.user as Record<string, unknown>;
  return c.json({
    id: u.id,
    username: u.username,
    name: u.name,
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    internal_numbers: u.internal_numbers ?? null,
    mobile_numbers: u.mobile_numbers ?? null,
    created_at: u.created_at ?? null,
    telegram_chat_id: u.telegram_chat_id ?? null,
    telegram_daily_report: u.telegram_daily_report ?? false,
    telegram_manager_report: u.telegram_manager_report ?? false,
    max_chat_id: u.max_chat_id ?? null,
    max_daily_report: u.max_daily_report ?? false,
    max_manager_report: u.max_manager_report ?? false,
    filter_exclude_answering_machine: u.filter_exclude_answering_machine ?? false,
    filter_min_duration: u.filter_min_duration ?? 0,
    filter_min_replicas: u.filter_min_replicas ?? 0,
    email: u.email ?? null,
    telegram_weekly_report: u.telegram_weekly_report ?? false,
    telegram_monthly_report: u.telegram_monthly_report ?? false,
    email_daily_report: u.email_daily_report ?? false,
    email_weekly_report: u.email_weekly_report ?? false,
    email_monthly_report: u.email_monthly_report ?? false,
    report_include_call_summaries: u.report_include_call_summaries ?? false,
    report_detailed: u.report_detailed ?? false,
    report_include_avg_value: u.report_include_avg_value ?? false,
    report_include_avg_rating: u.report_include_avg_rating ?? false,
    kpi_base_salary: u.kpi_base_salary ?? 0,
    kpi_target_bonus: u.kpi_target_bonus ?? 0,
    kpi_target_talk_time_minutes: u.kpi_target_talk_time_minutes ?? 0,
    telegram_skip_weekends: u.telegram_skip_weekends ?? false,
    report_managed_user_ids: u.report_managed_user_ids ?? null,
  });
});

// REST: /api/calls - backward compatibility (frontend uses REST)
app.get("/api/calls", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const page = Number(c.req.query("page")) || 1;
  const perPage = Number(c.req.query("per_page")) || 15;
  const dateFrom = c.req.query("date_from");
  const dateTo = c.req.query("date_to");
  const direction = c.req.query("direction");
  const valueRaw = c.req.query("value");
  const value = valueRaw ? valueRaw.split(",").map(Number).filter((n) => !Number.isNaN(n)) : undefined;
  const operatorRaw = c.req.query("operator");
  const operator = operatorRaw ? operatorRaw.split(",").filter(Boolean) : undefined;

  const internalNumbers = getInternalNumbers(ctx.user as Record<string, unknown>);
  const mobileNumbers = getMobileNumbers(ctx.user as Record<string, unknown>);

  const offset = (page - 1) * perPage;
  const callsWithTranscripts = storage.getCallsWithTranscripts({
    limit: perPage,
    offset,
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    internalNumbers,
    mobileNumbers,
    direction: direction === "incoming" || direction === "Входящий" ? "Входящий" : direction === "outgoing" || direction === "Исходящий" ? "Исходящий" : undefined,
    valueScores: value,
    operators: operator,
  });
  const totalItems = storage.countCalls({
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    internalNumbers,
    mobileNumbers,
    direction: direction === "incoming" || direction === "Входящий" ? "Входящий" : direction === "outgoing" || direction === "Исходящий" ? "Исходящий" : undefined,
    valueScores: value,
    operators: operator,
  });
  const totalPages = Math.ceil(totalItems / perPage) || 1;

  return c.json({
    calls: callsWithTranscripts,
    pagination: {
      page,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
      next_num: page + 1,
      prev_num: page - 1,
      query: c.req.query("q") ?? "",
      date_from: dateFrom ?? "",
      date_to: dateTo ?? "",
      direction: direction ?? "all",
      status: c.req.query("status") ?? "all",
      manager: c.req.query("manager") ?? "",
      value: value ?? [],
      operator: operator ?? [],
    },
    metrics: storage.calculateMetrics(),
    managers: storage.getAllUsers().filter((u) => (u as Record<string, unknown>).internal_numbers),
  });
});

app.get("/api/calls/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = storage.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = storage.getTranscriptByCallId(id);
  const evaluation = storage.getEvaluation(id);
  return c.json({ call, transcript, evaluation });
});

app.post("/api/calls/:id/recommendations", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = storage.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = storage.getTranscriptByCallId(id);
  if (!transcript?.text) return c.json({ detail: "Transcript not found for this call" }, 400);
  return c.json({ detail: "DeepSeek recommendations not yet integrated" }, 501);
});

app.post("/api/calls/:id/evaluate", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = storage.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  const transcript = storage.getTranscriptByCallId(id);
  if (!transcript?.text) return c.json({ detail: "Transcript not found. Please transcribe the call first." }, 400);
  return c.json({ detail: "DeepSeek evaluation not yet integrated" }, 501);
});

app.delete("/api/calls/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const call = storage.getCall(id);
  if (!call) return c.json({ detail: "Call not found" }, 404);
  if (!storage.deleteCall(id)) return c.json({ detail: "Failed to delete call" }, 500);
  storage.addActivityLog("info", `Deleted call #${id}`, (ctx.user as Record<string, unknown>).username as string);
  return c.json({ success: true, message: `Call #${id} deleted` });
});

function getInternalNumbers(user: Record<string, unknown>): string[] | undefined {
  const nums = user.internal_numbers as string | undefined;
  if (!nums || String(nums).trim().toLowerCase() === "all") return undefined;
  if (["admin@mango", "admin@gmail.com"].includes((user.username as string) ?? "")) return undefined;
  return nums.split(",").map((s: string) => s.trim()).filter(Boolean) || undefined;
}

function getMobileNumbers(user: Record<string, unknown>): string[] | undefined {
  const nums = user.mobile_numbers as string | undefined;
  if (!nums?.trim()) return undefined;
  return nums.split(",").map((s: string) => s.trim()).filter(Boolean) || undefined;
}

function isAdmin(user: Record<string, unknown>): boolean {
  const un = user.username as string;
  const inn = user.internal_numbers as string;
  return un === "admin@mango" || un === "admin@gmail.com" || String(inn ?? "").trim().toLowerCase() === "all";
}

function canAccessUser(currentUser: Record<string, unknown>, targetUserId: number): boolean {
  if ((currentUser.id as number) === targetUserId) return true;
  return isAdmin(currentUser);
}

// REST: /api/users
app.get("/api/users", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  return c.json(storage.getAllUsers());
});

app.post("/api/users", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const body = await c.req.json<{ username: string; password: string; first_name: string; last_name?: string; internal_numbers?: string; mobile_numbers?: string }>();
  if (!body.username || !body.password || !body.first_name) return c.json({ detail: "Username, password, and first name are required" }, 400);
  const existing = storage.getUserByUsername(body.username);
  if (existing) return c.json({ detail: "User with this username already exists" }, 400);
  try {
    const id = storage.createUser(body.username, body.password, body.first_name, body.last_name ?? "", body.internal_numbers ?? null, body.mobile_numbers ?? null);
    storage.addActivityLog("info", `User created: ${body.username}`, (ctx.user as Record<string, unknown>).username as string);
    const user = storage.getUser(id);
    return c.json(user!);
  } catch (e) {
    return c.json({ detail: String(e) }, 500);
  }
});

app.get("/api/users/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  if (!canAccessUser(ctx.user as Record<string, unknown>, id)) return c.json({ detail: "Not authorized" }, 403);
  const user = storage.getUser(id);
  if (!user) return c.json({ detail: "User not found" }, 404);
  return c.json(user);
});

app.put("/api/users/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  if (!canAccessUser(ctx.user as Record<string, unknown>, id)) return c.json({ detail: "Not authorized" }, 403);
  const user = storage.getUser(id);
  if (!user) return c.json({ detail: "User not found" }, 404);
  const body = await c.req.json<Record<string, unknown>>();
  const u = user as Record<string, unknown>;
  const firstName = ((body.first_name as string) ?? u.first_name ?? "").toString().trim() || (u.first_name as string);
  const lastName = body.last_name !== undefined ? String(body.last_name ?? "") : (u.last_name ?? "");
  if (!firstName) return c.json({ detail: "First name is required" }, 400);
  storage.updateUserName(id, firstName, lastName);
  if (body.internal_numbers !== undefined) storage.updateUserInternalNumbers(id, body.internal_numbers as string | null);
  if (body.mobile_numbers !== undefined) storage.updateUserMobileNumbers(id, body.mobile_numbers as string | null);
  storage.updateUserFilters(id, !!(body.filter_exclude_answering_machine ?? u.filter_exclude_answering_machine), Number(body.filter_min_duration ?? u.filter_min_duration ?? 0), Number(body.filter_min_replicas ?? u.filter_min_replicas ?? 0));
  storage.updateUserTelegramSettings(id, (u.telegram_chat_id as string) ?? null, !!(body.telegram_daily_report ?? u.telegram_daily_report), !!(body.telegram_manager_report ?? u.telegram_manager_report));
  storage.updateUserReportKpiSettings(id, body as Parameters<typeof storage.updateUserReportKpiSettings>[1]);
  storage.addActivityLog("info", `User updated: ${user.username}`, (ctx.user as Record<string, unknown>).username as string);
  const updated = storage.getUser(id);
  return c.json(updated!);
});

app.delete("/api/users/:id", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ detail: "Invalid id" }, 400);
  const user = storage.getUser(id);
  if (!user) return c.json({ detail: "User not found" }, 404);
  if ((ctx.user as Record<string, unknown>).id === id) return c.json({ detail: "Cannot delete your own account" }, 400);
  if (!storage.deleteUser(id)) return c.json({ detail: "Failed to delete user" }, 500);
  storage.addActivityLog("info", `User deleted: ${user.username}`, (ctx.user as Record<string, unknown>).username as string);
  return c.json({ success: true, message: `User ${user.username} deleted` });
});

app.post("/api/users/:id/change-password", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ new_password: string; confirm_password: string }>();
  if (!body.new_password) return c.json({ detail: "Password cannot be empty" }, 400);
  if (body.new_password !== body.confirm_password) return c.json({ detail: "Passwords do not match" }, 400);
  const user = storage.getUser(id);
  if (!user) return c.json({ detail: "User not found" }, 404);
  if (!storage.updateUserPassword(id, body.new_password)) return c.json({ detail: "Failed to change password" }, 500);
  storage.addActivityLog("info", `Password changed for user: ${user.username}`, (ctx.user as Record<string, unknown>).username as string);
  return c.json({ success: true, message: "Password changed successfully" });
});

app.post("/api/users/:id/telegram-auth-url", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!canAccessUser(ctx.user as Record<string, unknown>, id)) return c.json({ detail: "Not authorized" }, 403);
  const user = storage.getUser(id);
  if (!user) return c.json({ detail: "User not found" }, 404);
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 22);
  if (!storage.saveTelegramConnectToken(id, token)) return c.json({ detail: "Failed to save token" }, 500);
  return c.json({ url: `https://t.me/mango_react_bot?start=${token}` });
});

app.delete("/api/users/:id/telegram", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!canAccessUser(ctx.user as Record<string, unknown>, id)) return c.json({ detail: "Not authorized" }, 403);
  if (!storage.disconnectTelegram(id)) return c.json({ detail: "Failed to disconnect Telegram" }, 500);
  return c.json({ success: true });
});

app.post("/api/users/:id/max-auth-url", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!canAccessUser(ctx.user as Record<string, unknown>, id)) return c.json({ detail: "Not authorized" }, 403);
  const user = storage.getUser(id);
  if (!user) return c.json({ detail: "User not found" }, 404);
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 22);
  if (!storage.saveMaxConnectToken(id, token)) return c.json({ detail: "Failed to save token" }, 500);
  return c.json({ manual_instruction: `Отправьте боту команду: /start ${token}`, token });
});

app.delete("/api/users/:id/max", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!canAccessUser(ctx.user as Record<string, unknown>, id)) return c.json({ detail: "Not authorized" }, 403);
  if (!storage.disconnectMax(id)) return c.json({ detail: "Failed to disconnect MAX" }, 500);
  return c.json({ success: true });
});

// REST: /api/settings
app.get("/api/settings/prompts", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  return c.json(storage.getAllPrompts());
});

app.put("/api/settings/prompts", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const body = await c.req.json<Record<string, unknown>>();
  if (body.prompts && typeof body.prompts === "object") {
    for (const [key, val] of Object.entries(body.prompts as Record<string, { value?: string; description?: string }>)) {
      if (val?.value !== undefined) storage.updatePrompt(key, val.value ?? "", val.description ?? "");
    }
  }
  return c.json({ success: true, message: "Settings updated successfully" });
});

app.get("/api/settings/models", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const current = storage.getPrompt("deepseek_model", "deepseek-chat");
  return c.json({ models: { "deepseek-chat": { name: "DeepSeek Chat", max_tokens: 8192 }, "deepseek-coder": { name: "DeepSeek Coder", max_tokens: 8192 } }, current_model: current });
});

app.post("/api/settings/backup", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const { mkdirSync, copyFileSync, existsSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const dbPath = process.env.BACKEND_DB_PATH ?? resolve(__dirname, "../../backend/data/db.sqlite");
  if (!existsSync(dbPath)) return c.json({ detail: "База данных не найдена" }, 500);
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 15);
  const backupFilename = `db_${timestamp}.sqlite`;
  const backupsDir = resolve(dirname(dbPath), "backups");
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });
  const backupPath = resolve(backupsDir, backupFilename);
  copyFileSync(dbPath, backupPath);
  storage.addActivityLog("info", `Резервная копия базы: ${backupFilename}`, (ctx.user as Record<string, unknown>).username as string);
  return c.json({ success: true, message: "Резервная копия создана.", path: backupPath });
});

// REST: /api/statistics, /api/metrics
app.get("/api/statistics", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  if (!isAdmin(ctx.user as Record<string, unknown>)) return c.json({ detail: "Forbidden" }, 403);
  const dateFrom = c.req.query("date_from");
  const dateTo = c.req.query("date_to");
  let df = dateFrom;
  let dt = dateTo;
  if (!df && !dt) {
    const now = new Date();
    dt = now.toISOString().slice(0, 10);
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    df = d.toISOString().slice(0, 10);
  } else {
    if (df && !dt) dt = df;
    if (dt && !df) df = dt;
  }
  const stats = storage.getEvaluationsStats({ dateFrom: df ? `${df} 00:00:00` : undefined, dateTo: dt ? `${dt} 23:59:59` : undefined });
  const statsList = Object.values(stats);
  return c.json({ statistics: statsList, date_from: df ?? "", date_to: dt ?? "" });
});

app.get("/api/metrics", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  return c.json(storage.calculateMetrics());
});

// REST: /api/reports
app.post("/api/reports/send-test-telegram", async (c) => {
  const ctx = await createBackendContext({ headers: c.req.raw.headers });
  if (!ctx.user) return c.json({ detail: "Unauthorized" }, 401);
  const user = storage.getUserByUsername((ctx.user as Record<string, unknown>).username as string);
  if (!user) return c.json({ detail: "User not found" }, 404);
  const chatId = (user as Record<string, unknown>).telegram_chat_id as string | undefined;
  if (!chatId) return c.json({ detail: "Telegram Chat ID is not set for this user" }, 400);
  return c.json({ detail: "Telegram service not yet integrated" }, 501);
});

// Health
app.get("/", (c) => c.json({ message: "Mango Office Transcription API", version: "2.0.0" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// 404
app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 8000);

console.log(`[backend-server] Running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
