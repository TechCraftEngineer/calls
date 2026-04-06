import { settingsService } from "@calls/db";
import { syncFtp } from "../../megafon/ftp-sync";
import { inngest, transcribeRequested } from "../client";

export const megafonSyncFn = inngest.createFunction(
  {
    id: "megafon-ftp-sync",
    name: "Загрузка записей FTP",
    retries: 2,
    triggers: [{ cron: "TZ=Europe/Moscow */45 * * * *" }],
  },
  async ({ step }) => {
    try {
      const integrations = await settingsService.getActiveFtpIntegrations();

      if (integrations.length === 0) {
        return {
          skipped: true,
          reason: "Нет активных интеграций FTP",
        };
      }

      const allCreatedCallIds: string[] = [];
      let totalDownloaded = 0;
      let totalSkipped = 0;
      let totalS3Uploaded = 0;
      const allErrors: string[] = [];

      for (const integration of integrations) {
        const result = await step.run(`sync-ftp-${integration.workspaceId}`, async () => {
          return syncFtp(
            {
              host: integration.host,
              user: integration.user,
              password: integration.password,
            },
            integration.workspaceId,
            {
              syncFromDate: integration.syncFromDate,
              excludePhoneNumbers: integration.excludePhoneNumbers,
            },
          );
        });

        totalDownloaded += result.downloaded;
        totalSkipped += result.skipped;
        totalS3Uploaded += result.s3Uploaded;
        allCreatedCallIds.push(...result.createdCallIds);
        allErrors.push(...result.errors);
      }

      // Запускаем транскрибацию для каждого нового звонка с аудио.
      // Дальше evaluate запустится автоматически из transcribe-call.
      if (allCreatedCallIds.length > 0) {
        await step.sendEvent(
          "trigger-transcriptions",
          allCreatedCallIds.map((callId) =>
            // Используем eventType.create, чтобы Inngest видел корректную схему события
            // и валидировал payload.
            transcribeRequested.create({ callId }),
          ),
        );
      }

      return {
        workspacesProcessed: integrations.length,
        downloaded: totalDownloaded,
        skipped: totalSkipped,
        s3Uploaded: totalS3Uploaded,
        transcriptionQueued: allCreatedCallIds.length,
        errors: allErrors,
        errorsCount: allErrors.length,
      };
    } catch (error) {
      throw new Error(`FTP sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);
