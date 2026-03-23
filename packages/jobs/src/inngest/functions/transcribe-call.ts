/**
 * Inngest функция: транскрибация звонка по callId.
 * Получает аудио из S3, запускает ASR pipeline, сохраняет транскрипт.
 */

import {
  callsService,
  filesService,
  pbxRepository,
  workspacesService,
} from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import { identifySpeakersWithLlm, runTranscriptionPipeline } from "../../asr";
import { createLogger } from "../../logger";
import { evaluateRequested, inngest, transcribeRequested } from "../client";

const logger = createLogger("transcribe-call");
const PBX_PROVIDER = "megapbx";

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация звонка (ASR + LLM нормализация)",
    retries: 2,
    concurrency: {
      limit: 1,
      key: "event.data.callId",
    },
    triggers: [transcribeRequested],
  },
  async ({ event, step }) => {
    const { callId } = event.data;
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
      const url = await getDownloadUrlForAsr(file.storageKey);
      // Диагностика: проверка доступности URL (Yandex SpeechKit получает 403 при недоступном URL)
      const headRes = await fetch(url, { method: "HEAD" });
      if (!headRes.ok) {
        logger.warn(
          "Pre-signed URL недоступен — проверьте права S3 ключа и bucket",
          {
            callId,
            storageKey: file.storageKey,
            status: headRes.status,
            statusText: headRes.statusText,
          },
        );
      }
      return url;
    });

    const workspace = await step.run("get-workspace", async () => {
      const ws = await workspacesService.getById(call.workspaceId);
      if (!ws) {
        logger.warn("Workspace not found for call transcription", {
          workspaceId: call.workspaceId,
          callId,
        });
        throw new Error(`Workspace not found: ${call.workspaceId}`);
      }
      return ws;
    });

    const managerNameFromPbx = await step.run(
      "resolve-manager-name-from-pbx",
      async () => {
        try {
          const pbxNumbers = await pbxRepository.listNumbers(
            call.workspaceId,
            PBX_PROVIDER,
          );
          const activePbxNumbers = pbxNumbers.filter(
            (number) => number.isActive,
          );
          const callPbxNumberId = call.pbxNumberId;
          const normalizedInternalNumber = call.internalNumber?.trim() || null;

          const matchedById = callPbxNumberId
            ? activePbxNumbers.find((number) => number.id === callPbxNumberId)
            : undefined;
          const matchedByInternalNumber =
            !matchedById && normalizedInternalNumber
              ? activePbxNumbers.find(
                  (number) =>
                    (number.extension?.trim() || null) ===
                    normalizedInternalNumber,
                )
              : undefined;

          const matchedNumber = matchedById ?? matchedByInternalNumber;
          const managerName =
            matchedNumber?.label?.trim() ||
            matchedNumber?.extension?.trim() ||
            matchedNumber?.phoneNumber?.trim() ||
            null;

          if (managerName) {
            logger.info("Менеджер определён из pbx_numbers", {
              callId,
              resolutionStrategy: matchedById
                ? "pbx_number_id"
                : "internal_number",
            });
          }

          return managerName;
        } catch (error) {
          logger.warn("Не удалось определить менеджера из pbx_numbers", {
            callId,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      },
    );

    const result = await step.run("transcribe", async () => {
      logger.info("Запуск транскрибации", {
        callId,
        audioUrlLength: audioUrl.length,
      });
      return runTranscriptionPipeline(audioUrl, {
        companyContext: workspace.description ?? undefined,
      });
    });

    const identifyResult = await step.run("identify-speakers", async () => {
      const fallbackManagerName = call.name?.trim() || null;
      return identifySpeakersWithLlm(result.normalizedText, {
        direction: call.direction,
        managerName: managerNameFromPbx ?? fallbackManagerName,
        workspaceId: call.workspaceId,
      });
    });
    const { text: finalText, customerName, operatorName } = identifyResult;

    await step.run("save-transcript", async () => {
      // Безопасная сериализация метаданных
      let serializedMetadata: Record<string, unknown> = {};
      try {
        if (result.metadata && typeof result.metadata === "object") {
          serializedMetadata = JSON.parse(JSON.stringify(result.metadata));
        }
        if (operatorName != null && operatorName !== "") {
          serializedMetadata.operatorName = operatorName;
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

    await step.sendEvent(
      "trigger-evaluation",
      evaluateRequested.create({ callId }),
    );

    return {
      callId,
      processingTimeMs: result.metadata.processingTimeMs,
      asrSource: result.metadata.asrSource,
      textLength: finalText.length,
      customerName: customerName ?? null,
    };
  },
);
