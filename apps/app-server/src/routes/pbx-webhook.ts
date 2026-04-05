import { timingSafeEqual } from "node:crypto";
import { createLogger } from "@calls/api";
import { callsService, pbxService } from "@calls/db";
import { inngest, pbxSyncRequested } from "@calls/jobs";
import { workspaceIdSchema } from "@calls/shared";
import type { Context, Hono } from "hono";
import { z } from "zod";
import { webhookRateLimit } from "../lib/webhook-rate-limit";

const backendLogger = createLogger("backend-server");
const SUPPORTED_COMMANDS = new Set(["history", "event", "contact", "rating"]);

// Zod схема для валидации параметров маршрута
const WebhookParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
});

// Zod схема для валидации payload вебхука
const webhookPayloadSchema = z
  .object({
    cmd: z.string().min(1),
    crm_token: z.string().optional(),
    type: z.string().optional(),
    phone: z.string().optional(),
  })
  .passthrough();

function isWebhookSecretValid(
  expectedSecret: string | undefined,
  receivedSecret: string | null | undefined,
): boolean {
  if (!expectedSecret) return true;
  if (!receivedSecret) return false;

  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const receivedBuffer = Buffer.from(receivedSecret, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    const maxLen = Math.max(expectedBuffer.length, receivedBuffer.length, 1);
    const paddedExpected = Buffer.alloc(maxLen);
    const paddedReceived = Buffer.alloc(maxLen);
    expectedBuffer.copy(paddedExpected);
    receivedBuffer.copy(paddedReceived);
    timingSafeEqual(paddedExpected, paddedReceived);
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isAnyWebhookSecretValid(
  expectedSecret: string | undefined,
  receivedSecrets: Array<string | null | undefined>,
): boolean {
  if (!expectedSecret) return true;
  for (const secret of receivedSecrets) {
    if (isWebhookSecretValid(expectedSecret, secret)) return true;
  }
  return false;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function parseWebhookPayload(c: Context): Promise<Record<string, unknown> | null> {
  const contentType = (c.req.header("content-type") ?? "").toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await c.req.text();
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }

  if (contentType.includes("application/json")) {
    const payload = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  }

  // Legacy fallback: read body once, then try JSON and urlencoded parsing.
  const raw = await c.req.text().catch(() => "");
  if (!raw.trim()) return null;
  const jsonPayload = (() => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  })();
  if (jsonPayload && typeof jsonPayload === "object" && !Array.isArray(jsonPayload)) {
    return jsonPayload as Record<string, unknown>;
  }
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
}

const handlePbxWebhook = async (c: Context) => {
  // Invoked by /api/pbx-webhook and /api/megapbx-webhook.
  // История звонков приходит от АТС в формате requests#history:
  // https://api.megapbx.ru/#/docs/crmapi/v1/requests#history
  const paramsResult = WebhookParamsSchema.safeParse({ workspaceId: c.req.param("workspaceId") });
  if (!paramsResult.success) {
    return c.json({ error: "Некорректное рабочее пространство" }, 400);
  }
  const { workspaceId } = paramsResult.data;

  const config = await pbxService.getConfigWithSecrets(workspaceId);
  if (!config) {
    return c.json({ error: "Интеграция MegaPBX не настроена" }, 404);
  }
  if (!config.webhooksEnabled) {
    return c.json({ error: "Webhook MegaPBX отключён" }, 409);
  }

  const payload = await parseWebhookPayload(c);
  if (!payload) {
    return c.json(
      {
        error: "Неверный формат тела запроса. Ожидается JSON или x-www-form-urlencoded.",
      },
      400,
    );
  }

  const parsedPayload = webhookPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return c.json(
      {
        error: "Неверный формат тела запроса. Ожидается объект с непустым полем cmd.",
      },
      400,
    );
  }

  const command = asNonEmptyString(parsedPayload.data.cmd)?.toLowerCase();
  if (!command || !SUPPORTED_COMMANDS.has(command)) {
    return c.json(
      {
        error: "Неподдерживаемая команда webhook. Ожидается cmd=history|event|contact|rating.",
      },
      400,
    );
  }

  const crmToken = asNonEmptyString(parsedPayload.data.crm_token);
  const signature = c.req.header("x-megapbx-secret") ?? c.req.header("x-webhook-secret");
  if (!isAnyWebhookSecretValid(config.webhook?.secret, [crmToken, signature])) {
    backendLogger.warn("Rejected MegaPBX webhook because of invalid secret", {
      workspaceId,
      command,
    });
    return c.json({ error: "Неверный crm_token или секрет вебхука" }, 401);
  }

  const eventSubtype = asNonEmptyString(parsedPayload.data.type) ?? "unknown";
  const eventType = `${command}:${eventSubtype}`;
  const eventId =
    asNonEmptyString(payload.callid) ??
    asNonEmptyString(payload.callId) ??
    asNonEmptyString(payload.call_id) ??
    asNonEmptyString(payload.eventId) ??
    asNonEmptyString(payload.id) ??
    asNonEmptyString(payload.uid) ??
    null;

  await pbxService.recordWebhookEvent({
    workspaceId,
    eventId,
    eventType,
    payload,
    status: "received",
  });

  if (command === "contact") {
    const phone = asNonEmptyString(parsedPayload.data.phone);
    const contact = phone ? await callsService.findLatestContactByPhone(workspaceId, phone) : null;
    const contactName = contact?.customerName?.trim() || (phone ? `Клиент ${phone}` : "");
    const responsible = contact?.internalNumber?.trim() || contact?.name?.trim() || "";

    await pbxService.recordWebhookEvent({
      workspaceId,
      eventId,
      eventType,
      payload,
      status: "processed",
      processedAt: new Date(),
    });
    return c.json({ contact_name: contactName, responsible: responsible });
  }

  if (command !== "history") {
    await pbxService.recordWebhookEvent({
      workspaceId,
      eventId,
      eventType,
      payload,
      status: "processed",
      processedAt: new Date(),
    });
    return c.json({ success: true });
  }

  try {
    await inngest.send(
      pbxSyncRequested.create({
        workspaceId,
        syncType: "calls",
        // В очередь кладем признак загрузки записей, чтобы фоновой синхронизации
        // реально скачивать recordingUrl и грузить файл в наше хранилище.
        syncRecordings: config.syncRecordings,
        webhookEvent: {
          eventId,
          eventType,
          payload,
        },
      }),
    );
  } catch (error) {
    await pbxService.recordWebhookEvent({
      workspaceId,
      eventId,
      eventType,
      payload,
      status: "error",
      processedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    backendLogger.error("Сбой добавления webhook MegaPBX в очередь", {
      workspaceId,
      command,
      eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "Обработка webhook не удалась" }, 500);
  }

  await pbxService.recordWebhookEvent({
    workspaceId,
    eventId,
    eventType,
    payload,
    status: "queued",
  });

  return c.json({ success: true });
};

export const registerPbxWebhookRoutes = (app: Hono) => {
  app.post("/api/pbx-webhook/:workspaceId", webhookRateLimit, handlePbxWebhook);
  app.post("/api/megapbx-webhook/:workspaceId", webhookRateLimit, handlePbxWebhook);
};
