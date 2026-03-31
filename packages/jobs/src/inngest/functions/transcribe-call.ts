/**
 * Inngest функция: транскрибация звонка по callId.
 * Получает аудио из S3, запускает ASR pipeline, сохраняет транскрипт.
 */

import { identifySpeakersWithLlm } from "@calls/asr/llm/identify-speakers";
import { runTranscriptionPipelineFromAsrAudio } from "@calls/asr/pipeline/run-transcription-pipeline";
import { runPipelineAudioPreprocess } from "@calls/asr/pipeline/transcribe-pipeline-audio";
import {
  callsService,
  filesService,
  pbxRepository,
  workspaceIntegrationsRepository,
  workspacesService,
} from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import { createLogger } from "../../logger";
import { evaluateRequested, inngest, transcribeRequested } from "../client";

const logger = createLogger("transcribe-call");

function buildCompanyContext(workspace: {
  name?: string | null;
  description?: string | null;
}): string | undefined {
  const parts: string[] = [];
  const companyName = workspace.name?.trim();
  const companyDescription = workspace.description?.trim();

  if (companyName) {
    parts.push(`Название компании: ${companyName}`);
  }
  if (companyDescription) {
    parts.push(`Описание компании: ${companyDescription}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация: Inngest → audio-enhancer → giga-am → LLM",
    retries: 2,
    concurrency: {
      limit: 1,
    },
    triggers: [transcribeRequested],
  },
  async ({ event, step }) => {
    const { callId } = event.data;
    await step.run("validate/input", async () => {
      if (!callId) {
        throw new Error("callId обязателен");
      }
    });

    // Проверяем, что транскрипт еще не существует
    const existingTranscript = await step.run("validate/transcript:not-exists", async () => {
      return await callsService.getTranscriptByCallId(callId);
    });

    // Если транскрипт уже существует, завершаем успешно
    if (existingTranscript) {
      logger.info("Транскрипт уже существует, пропускаем", { callId });
      return {
        callId,
        skipped: true,
        reason: "transcript_already_exists",
        message: "Транскрипт уже существует",
      };
    }

    const call = await step.run("db/calls:get", async () => {
      const c = await callsService.getCall(callId);
      if (!c) throw new Error(`Звонок не найден: ${callId}`);
      if (!c.fileId) throw new Error(`У звонка ${callId} нет привязанного файла`);
      return c;
    });

    const workspace = await step.run("db/workspaces:get", async () => {
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

    const managerNameFromPbx = await step.run("pbx/manager:resolve", async () => {
      try {
        const pbxIntegration = await workspaceIntegrationsRepository.getByWorkspaceAndType(
          call.workspaceId,
          "megapbx",
        );

        if (!pbxIntegration?.enabled) {
          logger.info("PBX integration not enabled for workspace", {
            callId,
            workspaceId: call.workspaceId,
          });
          return null;
        }

        const rawProvider =
          typeof pbxIntegration.config === "object" &&
          pbxIntegration.config !== null &&
          "provider" in pbxIntegration.config
            ? pbxIntegration.config.provider
            : undefined;
        const integrationProvider =
          typeof rawProvider === "string" ? rawProvider.trim() : "megapbx";
        if (!integrationProvider) {
          logger.warn("PBX integration provider is missing", {
            callId,
            workspaceId: call.workspaceId,
          });
          return null;
        }

        const pbxNumbers = await pbxRepository.listNumbers(call.workspaceId, integrationProvider);
        const activePbxNumbers = pbxNumbers.filter((number) => number.isActive);
        const normalizedInternalNumber = call.internalNumber?.trim() || null;

        const matchedByInternalNumber = normalizedInternalNumber
          ? activePbxNumbers.find(
              (number) => (number.extension?.trim() || null) === normalizedInternalNumber,
            )
          : undefined;

        const matchedNumber = matchedByInternalNumber;
        const managerName =
          matchedNumber?.label?.trim() ||
          matchedNumber?.extension?.trim() ||
          matchedNumber?.phoneNumber?.trim() ||
          null;

        if (managerName) {
          logger.info("Менеджер определён из pbx_numbers", {
            callId,
            resolutionStrategy: "internal_number",
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
    });

    const pipelineAudio = await step.run("pipeline/audio:preprocess", async () => {
      logger.info("Inngest: audio-enhancer /preprocess", { callId });
      const originalFileId = call.fileId;
      if (!originalFileId) {
        throw new Error(`У звонка ${callId} нет привязанного файла`);
      }
      const f = await filesService.getFileById(originalFileId);
      if (!f) {
        throw new Error(`Файл не найден: ${originalFileId}`);
      }
      return runPipelineAudioPreprocess({
        callId,
        workspaceId: call.workspaceId,
        originalFileId,
        originalStorageKey: f.storageKey,
      });
    });

    const result = await step.run("pipeline/asr:transcribe", async () => {
      logger.info("Inngest: giga-am ASR pipeline", { callId });
      const f = await filesService.getFileById(pipelineAudio.preprocessedFileId);
      if (!f) {
        throw new Error(`Файл после preprocess не найден: ${pipelineAudio.preprocessedFileId}`);
      }
      const asrAudioUrl = await getDownloadUrlForAsr(f.storageKey);
      return runTranscriptionPipelineFromAsrAudio(asrAudioUrl, pipelineAudio.preprocessingResult, {
        companyContext: buildCompanyContext(workspace),
        gigaPreprocessMetadata: pipelineAudio.preprocessMetadata,
      });
    });

    const identifyResult = await step.run("llm/diarize", async () => {
      const fallbackManagerName = call.name?.trim() || null;
      return identifySpeakersWithLlm(result.normalizedText, {
        direction: call.direction,
        managerName: managerNameFromPbx ?? fallbackManagerName,
        workspaceId: call.workspaceId,
      });
    });
    const { text: finalText, customerName, operatorName } = identifyResult;

    await step.run("persist/transcript:upsert", async () => {
      const normalizedCallType = result.callType?.trim() || null;
      // Безопасная сериализация метаданных
      let serializedMetadata: Record<string, unknown> = {};
      try {
        if (result.metadata && typeof result.metadata === "object") {
          serializedMetadata = JSON.parse(JSON.stringify(result.metadata));
        }
        if (operatorName != null && operatorName !== "") {
          serializedMetadata.operatorName = operatorName;
        }
        if (identifyResult.metadata && typeof identifyResult.metadata === "object") {
          serializedMetadata.diarization = identifyResult.metadata;
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
        callType: normalizedCallType,
        callTopic: result.callTopic,
      });

      if (customerName) {
        await callsService.updateCustomerName(callId, customerName);
      }

      logger.info("Транскрипт сохранён", {
        callId,
        processingTimeMs: result.metadata.processingTimeMs,
        asrSource: result.metadata.asrSource,
      });
    });

    await step.sendEvent("event/call.evaluate.requested", evaluateRequested.create({ callId }));

    return {
      callId,
      processingTimeMs: result.metadata.processingTimeMs,
      asrSource: result.metadata.asrSource,
      textLength: finalText.length,
      customerName: customerName ?? null,
    };
  },
);
