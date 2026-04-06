import { pbxService } from "@calls/db";
import { inngest, pbxSyncRequested } from "@calls/jobs/client";
import { runActivePbxSync, syncPbxCalls, syncPbxDirectory } from "@calls/jobs/pbx/sync";
import { createLogger } from "../../logger";

const logger = createLogger("pbx-sync");

export const pbxSyncFn = inngest.createFunction(
  {
    id: "pbx-api-sync",
    name: "PBX API синхронизация",
    retries: 1,
    triggers: [{ cron: "TZ=Europe/Moscow */45 * * * *" }],
  },
  async () => {
    const results = await runActivePbxSync();
    return {
      processed: results.length,
      success: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  },
);

export const megaPbxSyncFn = pbxSyncFn;

export const pbxSyncRequestedFn = inngest.createFunction(
  {
    id: "pbx-api-sync-requested",
    name: "PBX API синхронизация (по запросу)",
    retries: 1,
    triggers: [pbxSyncRequested],
    concurrency: {
      limit: 1,
      key: "event.data.workspaceId",
    },
  },
  async ({ event, step }) => {
    const { workspaceId, syncType, syncRecordings = false, webhookEvent } = event.data;
    if (!workspaceId) {
      throw new Error("workspaceId обязателен");
    }

    logger.info("Запуск PBX синхронизации по запросу", {
      workspaceId,
      syncType,
      syncRecordings,
      source: webhookEvent ? "webhook" : "manual",
      webhookEventType: webhookEvent?.eventType ?? null,
    });

    try {
      const config = await step.run("get-pbx-config", async () => {
        return pbxService.getConfigWithSecrets(workspaceId);
      });
      if (!config) {
        throw new Error("PBX интеграция не настроена");
      }

      const result = await step.run(`sync-${syncType}`, async () => {
        return syncType === "directory"
          ? syncPbxDirectory(workspaceId, config)
          : syncPbxCalls(workspaceId, { ...config, syncRecordings }, webhookEvent?.payload);
      });

      if (webhookEvent) {
        await step.run("mark-webhook-processed", async () => {
          await pbxService.recordWebhookEvent({
            workspaceId,
            eventId: webhookEvent.eventId ?? null,
            eventType: webhookEvent.eventType,
            payload: webhookEvent.payload,
            status: "processed",
            processedAt: new Date(),
            errorMessage: null,
          });
        });
      }

      logger.info("PBX синхронизация по запросу завершена", {
        workspaceId,
        syncType,
        stats: result,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (webhookEvent) {
        await step.run("mark-webhook-error", async () => {
          await pbxService.recordWebhookEvent({
            workspaceId,
            eventId: webhookEvent.eventId ?? null,
            eventType: webhookEvent.eventType,
            payload: webhookEvent.payload,
            status: "error",
            processedAt: new Date(),
            errorMessage,
          });
        });
      }

      logger.error("PBX синхронизация по запросу завершилась с ошибкой", {
        workspaceId,
        syncType,
        error: errorMessage,
      });

      throw error;
    }
  },
);
