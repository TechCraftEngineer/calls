import { settingsService } from "@calls/db";
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
    const { host, user, password } =
      await settingsService.getMegafonFtpSettings();

    if (!host || !user || !password) {
      return {
        skipped: true,
        reason: "MEGAFON_FTP_* не настроены",
      };
    }

    const result = await step.run("sync-ftp", async () => {
      return syncMegafonFtp({ host, user, password });
    });

    // Запускаем транскрибацию для каждого нового звонка с аудио
    if (result.createdCallIds.length > 0) {
      await step.sendEvent(
        "trigger-transcriptions",
        result.createdCallIds.map((callId) => ({
          name: "call/transcribe.requested",
          data: { callId },
        })),
      );
    }

    return {
      downloaded: result.downloaded,
      skipped: result.skipped,
      s3Uploaded: result.s3Uploaded,
      transcriptionQueued: result.createdCallIds.length,
      errors: result.errors,
      errorsCount: result.errors.length,
    };
  },
);
