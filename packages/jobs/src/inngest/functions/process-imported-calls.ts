import { callsService } from "@calls/db";
import { createLogger } from "../../logger";
import { inngest, processImportedCalls, transcribeRequested } from "../client";

const logger = createLogger("process-imported-calls");

/**
 * Обрабатывает импортированные звонки - ставит их в очередь на транскрибацию
 */
export const processImportedCallsFn = inngest.createFunction(
  {
    id: "calls-process-imported",
    name: "Обработка импортированных звонков",
    retries: 2,
    triggers: [processImportedCalls],
  },
  async ({ event, step }) => {
    const { workspaceId, importedCount } = event.data;

    logger.info("Начало обработки импортированных звонков", {
      workspaceId,
      importedCount,
    });

    // Получаем все звонки с записями, которые еще не обработаны
    const unprocessedCalls = await step.run("fetch-unprocessed-calls", async () => {
      return callsService.findUnprocessedCallsWithRecordings(workspaceId, 1000);
    });

    logger.info("Найдено необработанных звонков с записями", {
      workspaceId,
      count: unprocessedCalls.length,
    });

    if (unprocessedCalls.length === 0) {
      return {
        success: true,
        queued: 0,
        message: "Нет звонков для обработки",
      };
    }

    // Ставим звонки в очередь на транскрибацию
    const events = unprocessedCalls.map((call) =>
      transcribeRequested.create({
        callId: call.id,
      }),
    );

    await step.run("queue-transcriptions", async () => {
      await inngest.send(events);
    });

    logger.info("Звонки поставлены в очередь на транскрибацию", {
      workspaceId,
      queued: events.length,
    });

    return {
      success: true,
      queued: events.length,
      message: `${events.length} звонков поставлено в очередь на обработку`,
    };
  },
);
