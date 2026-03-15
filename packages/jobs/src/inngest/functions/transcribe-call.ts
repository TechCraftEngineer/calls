/**
 * Inngest функция: транскрибация звонка по callId.
 * Получает аудио из S3, запускает ASR pipeline, сохраняет транскрипт.
 */

import { callsService, filesService, promptsService } from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import { identifySpeakersWithLlm, runTranscriptionPipeline } from "../../asr";
import { createLogger } from "../../logger";
import { inngest } from "../client";

const logger = createLogger("transcribe-call");

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация звонка (ASR + LLM нормализация)",
    retries: 2,
  },
  { event: "call/transcribe.requested" },
  async ({ event, step }) => {
    const { callId } = event.data as { callId: string };
    if (!callId) {
      throw new Error("callId обязателен");
    }

    const call = await step.run("get-call", async () => {
      const c = await callsService.getCall(callId);
      if (!c) throw new Error(`Звонок не найден: ${callId}`);
      if (!c.fileId)
        throw new Error(`У звонка ${callId} нет привязанного файла`);
      return c;
    });

    const fileId = call.fileId;
    const audioUrl = await step.run("get-audio-url", async () => {
      if (!fileId) throw new Error(`У звонка ${callId} нет привязанного файла`);
      const file = await filesService.getFileById(fileId);
      if (!file) throw new Error(`Файл не найден: ${fileId}`);
      return getDownloadUrlForAsr(file.storageKey);
    });

    const summaryPrompt = await step.run("get-summary-prompt", async () => {
      return await promptsService.getPrompt("summary", call.workspaceId);
    });

    const result = await step.run("transcribe", async () => {
      logger.info("Запуск транскрибации", {
        callId,
        audioUrlLength: audioUrl.length,
      });
      return runTranscriptionPipeline(audioUrl, {
        summaryPrompt: summaryPrompt ?? undefined,
      });
    });

    const { text: finalText, customerName } = await step.run(
      "identify-speakers",
      async () => {
        return identifySpeakersWithLlm(result.normalizedText, {
          direction: call.direction,
          managerName: call.name,
          workspaceId: call.workspaceId,
          getPrompt: (key, wsId) => promptsService.getPrompt(key, wsId),
        });
      },
    );

    await step.run("save-transcript", async () => {
      // Безопасная сериализация метаданных
      let serializedMetadata: Record<string, unknown> = {};
      try {
        if (result.metadata && typeof result.metadata === "object") {
          serializedMetadata = JSON.parse(JSON.stringify(result.metadata));
        }
      } catch (error) {
        logger.warn("Ошибка сериализации метаданных", {
          callId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await callsService.upsertTranscript({
        callId,
        text: finalText,
        rawText: result.rawText,
        confidence: result.metadata.confidence ?? null,
        metadata: serializedMetadata,
        summary: result.summary,
        sentiment: result.sentiment,
        title: result.title,
        callTopic: result.callTopic,
      });

      if (
        typeof result.metadata.durationInSeconds === "number" &&
        result.metadata.durationInSeconds > 0
      ) {
        await callsService.updateCallDuration(
          callId,
          result.metadata.durationInSeconds,
        );
      }

      if (customerName) {
        await callsService.updateCustomerName(callId, customerName);
      }

      logger.info("Транскрипт сохранён", {
        callId,
        processingTimeMs: result.metadata.processingTimeMs,
        asrSource: result.metadata.asrSource,
      });
    });

    return {
      callId,
      processingTimeMs: result.metadata.processingTimeMs,
      asrSource: result.metadata.asrSource,
      textLength: finalText.length,
      customerName: customerName ?? null,
    };
  },
);
