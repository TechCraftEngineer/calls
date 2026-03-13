import { syncMegafonFtp } from "../../megafon/ftp-sync";
import { inngest } from "../client";

export const megafonSyncFn = inngest.createFunction(
  {
    id: "megafon-ftp-sync",
    name: "Загрузка записей Megafon PBX FTP",
    retries: 2,
  },
  { cron: "TZ=Europe/Moscow */15 * * * *" },
  async ({ step }) => {
    const host = process.env.MEGAFON_FTP_HOST;
    const user = process.env.MEGAFON_FTP_USER;
    const password = process.env.MEGAFON_FTP_PASSWORD;

    if (!host || !user || !password) {
      return {
        skipped: true,
        reason: "MEGAFON_FTP_* не настроены",
      };
    }

    const result = await step.run("sync-ftp", async () => {
      return syncMegafonFtp({ host, user, password });
    });

    return {
      downloaded: result.downloaded,
      skipped: result.skipped,
      errors: result.errors,
      errorsCount: result.errors.length,
    };
  },
);
