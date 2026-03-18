import { runActivePbxSync } from "../../pbx/sync";
import { inngest } from "../client";

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
