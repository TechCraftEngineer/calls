import { timingSafeEqual } from "node:crypto";
import { createLogger } from "@calls/api";
import { isValidWorkspaceId, pbxService } from "@calls/db";
import { inngest, pbxSyncRequested } from "@calls/jobs";
import type { Context, Hono } from "hono";
import { webhookRateLimit } from "../lib/webhook-rate-limit";

const backendLogger = createLogger("backend-server");

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

const handlePbxWebhook = async (c: Context) => {
  // Invoked by /api/pbx-webhook and /api/megapbx-webhook.
  // История звонков приходит от АТС в формате requests#history:
  // https://api.megapbx.ru/#/docs/crmapi/v1/requests#history
  const workspaceId = c.req.param("workspaceId");
  if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
    return c.json({ error: "Некорректное рабочее пространство" }, 400);
  }

  const config = await pbxService.getConfigWithSecrets(workspaceId);
  if (!config) {
    return c.json({ error: "Интеграция MegaPBX не настроена" }, 404);
  }
  if (!config.webhooksEnabled) {
    return c.json({ error: "Webhook MegaPBX отключён" }, 409);
  }

  const payload = (await c.req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!payload) {
    return c.json({ error: "Неверный JSON" }, 400);
  }

  const signature =
    c.req.header("x-megapbx-secret") ?? c.req.header("x-webhook-secret");
  if (!isWebhookSecretValid(config.webhook?.secret, signature)) {
    backendLogger.warn("Rejected MegaPBX webhook because of invalid secret", {
      workspaceId,
    });
    return c.json({ error: "Неверный секрет вебхука" }, 401);
  }

  const eventType =
    (typeof payload.eventType === "string" && payload.eventType) ||
    (typeof payload.type === "string" && payload.type) ||
    "unknown";
  const eventId =
    (typeof payload.eventId === "string" && payload.eventId) ||
    (typeof payload.id === "string" && payload.id) ||
    (typeof payload.uid === "string" && payload.uid) ||
    null;

  await pbxService.recordWebhookEvent({
    workspaceId,
    eventId,
    eventType,
    payload,
    status: "received",
  });

  try {
    await inngest.send(
      pbxSyncRequested.create({
        workspaceId,
        syncType:
          eventType.toLowerCase().includes("employee") ||
          eventType.toLowerCase().includes("number")
            ? "directory"
            : "calls",
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
  app.post(
    "/api/megapbx-webhook/:workspaceId",
    webhookRateLimit,
    handlePbxWebhook,
  );
};
