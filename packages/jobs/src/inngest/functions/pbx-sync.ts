import { pbxService } from "@calls/db";
import {
  runActivePbxSync,
  syncPbxCalls,
  syncPbxDirectory,
} from "../../pbx/sync";
import { inngest, pbxSyncRequested } from "../client";

export const pbxSyncFn = inngest.createFunction(
  {
    id: "pbx-api-sync",
    name: "PBX API синхронизация",
    retries: 1,
    triggers: [{ cron: "TZ=Europe/Moscow */15 * * * *" }],
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
  async ({ event }) => {
    const {
      workspaceId,
      syncType,
      syncRecordings = false,
      webhookEvent,
    } = event.data;
    if (!workspaceId) {
      throw new Error("workspaceId обязателен");
    }

    const config = await pbxService.getConfigWithSecrets(workspaceId);
    if (!config) {
      throw new Error("PBX интеграция не настроена");
    }

    try {
      const result =
        syncType === "directory"
          ? await syncPbxDirectory(workspaceId, config)
          : await syncPbxCalls(workspaceId, {
              ...config,
              syncRecordings,
            });

      if (webhookEvent) {
        await pbxService.recordWebhookEvent({
          workspaceId,
          eventId: webhookEvent.eventId ?? null,
          eventType: webhookEvent.eventType,
          payload: webhookEvent.payload,
          status: "processed",
          processedAt: new Date(),
          errorMessage: null,
        });
      }

      return result;
    } catch (error) {
      if (webhookEvent) {
        await pbxService.recordWebhookEvent({
          workspaceId,
          eventId: webhookEvent.eventId ?? null,
          eventType: webhookEvent.eventType,
          payload: webhookEvent.payload,
          status: "error",
          processedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  },
);
