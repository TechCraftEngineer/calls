/**
 * Inngest функция: транскрибация звонка по callId.
 * Новая архитектура:
 * 1. ASR без диаризации (точный текст)
 * 2. ASR с диаризацией (разделение по спикерам)
 * 3. LLM merging объединяет оба результата
 * 4. Идентификация спикеров через LLM
 */

import { runPipelineAudioPreprocess } from "@calls/asr/pipeline/transcribe-pipeline-audio";
import { callsService, filesService, workspacesService } from "@calls/db";
import type { ZodIssue } from "zod";
import { createLogger } from "../../../logger";
import { evaluateRequested, inngest, transcribeRequested } from "../../client";
import { downloadAudioFile } from "./audio/download";
import { identifySpeakers } from "./speaker-identification";
import { processAudioWithDiarization } from "./gigaam/diarization";
import { processAudioWithoutDiarization } from "./gigaam/client";
import { resolveManagerFromPbx } from "./manager-resolution";
import { serializeMetadata } from "./metadata";
import type { AsrResult } from "./types";
import { applyLLMMerging } from "./llm-merge";
import {
  CallSchema,
  FileSchema,
  PipelineAudioResultSchema,
  TranscribeCallEventSchema,
  TranscriptionResultSchema,
  WorkspaceSchema,
} from "./schemas";
import { validateWorkspace } from "./validation";

const logger = createLogger("transcribe-call");

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация: Dual ASR + LLM Merge + Speaker ID",
    retries: 2,
    concurrency: {
      limit: 3,
      key: "event.data.callId",
    },
    triggers: [transcribeRequested],
    onFailure: async ({ event, error }) => {
      try {
        // Валидируем event перед использованием
        const eventValidation = TranscribeCallEventSchema.safeParse(event.data);
        if (!eventValidation.success) {
          logger.error("Ошибка валидации event в onFailure handler", {
            error: eventValidation.error.message,
            eventData: event.data,
          });
          return;
        }
        
        const { callId } = eventValidation.data;
        
        // Записываем статус failed в БД
        await callsService.markTranscriptionFailed(callId, error.message);
        logger.error("Транскрибация завершилась с ошибкой после всех попыток", {
          callId,
          error: error.message,
        });
      } catch (dbError) {
        logger.error("Не удалось записать статус ошибки транскрибации", {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          originalError: error.message,
        });
      }
    },
  },
  async ({ event, step }) => {
    const { callId } = event.data;
    await step.run("validate/input", async () => {
      const validationResult = TranscribeCallEventSchema.safeParse({ callId });
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Validation failed: ${errorDetails}`);
      }
      return validationResult.data;
    });

    const call = await step.run("db/calls:get", async () => {
      const c = await callsService.getCall(callId);
      if (!c) throw new Error(`Звонок не найден: ${callId}`);

      const validationResult = CallSchema.safeParse(c);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Call validation failed: ${errorDetails}`);
      }

      return validationResult.data;
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

      const validationResult = WorkspaceSchema.safeParse(ws);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Workspace validation failed: ${errorDetails}`);
      }

      const validatedWorkspace = validateWorkspace(validationResult.data);
      return validatedWorkspace || validationResult.data;
    });

    const managerNameFromPbx = await step.run("pbx/manager:resolve", async () => {
      return resolveManagerFromPbx(call);
    });

    const pipelineAudio = await step.run("pipeline/audio:preprocess", async () => {
      const originalFileId = call.fileId;
      if (!originalFileId) {
        throw new Error(`У звонка ${callId} нет привязанного файла`);
      }
      const f = await filesService.getFileById(originalFileId);
      if (!f) {
        throw new Error(`Файл не найден: ${originalFileId}`);
      }
      
      // Валидация файла
      const fileValidation = FileSchema.safeParse(f);
      if (!fileValidation.success) {
        const errorDetails = fileValidation.error.issues
          .map((issue: ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`File validation failed: ${errorDetails}`);
      }
      
      const pipelineResult = await runPipelineAudioPreprocess({
        callId,
        workspaceId: call.workspaceId,
        originalFileId,
        originalStorageKey: fileValidation.data.storageKey,
      });
      
      // Валидация результата pipeline
      const pipelineValidation = PipelineAudioResultSchema.safeParse(pipelineResult);
      if (!pipelineValidation.success) {
        const errorDetails = pipelineValidation.error.issues
          .map((issue: ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Pipeline validation failed: ${errorDetails}`);
      }
      
      return pipelineValidation.data;
    });

    // Объединяем download и ASR в один шаг для оптимизации
    const asrStartTime = Date.now();
    const asrResults = await step.run("asr:process", async () => {
      // Загружаем аудио файл
      const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

      // Параллельный запуск двух ASR с fallback механизмом
      const [nonDiarizedSettled, diarizedSettled] = await Promise.allSettled([
        processAudioWithoutDiarization(buffer, filename),
        processAudioWithDiarization(buffer, filename),
      ]);

      // Проверяем, что оба провайдера не упали
      if (nonDiarizedSettled.status === "rejected" && diarizedSettled.status === "rejected") {
        logger.error("Оба ASR провайдера завершились ошибкой", {
          callId,
          nonDiarizedError: nonDiarizedSettled.reason,
          diarizedError: diarizedSettled.reason,
        });
        throw new Error("Оба ASR провайдера завершились ошибкой");
      }

      // Fallback механизм: если один провайдер упал, используем результат другого
      const nonDiarizedResult: AsrResult = nonDiarizedSettled.status === "fulfilled"
        ? nonDiarizedSettled.value
        : diarizedSettled.status === "fulfilled"
          ? diarizedSettled.value
          : (() => { throw new Error("Нет доступных ASR результатов для non-diarized"); })();

      const diarizedResult: AsrResult = diarizedSettled.status === "fulfilled"
        ? diarizedSettled.value
        : nonDiarizedSettled.status === "fulfilled"
          ? nonDiarizedSettled.value
          : (() => { throw new Error("Нет доступных ASR результатов для diarized"); })();

      // Логируем fallback ситуации
      if (nonDiarizedSettled.status === "rejected" || diarizedSettled.status === "rejected") {
        logger.warn("ASR fallback активирован", {
          callId,
          nonDiarizedFailed: nonDiarizedSettled.status === "rejected",
          diarizedFailed: diarizedSettled.status === "rejected",
        });
      }
      
      return {
        nonDiarized: nonDiarizedResult,
        diarized: diarizedResult,
      };
    });

    // Логирование результатов ASR
    logger.info("ASR results", {
      callId,
      nonDiarizedProvider: asrResults.nonDiarized.metadata.asrLogs[0]?.provider,
      nonDiarizedTranscriptLength: asrResults.nonDiarized.transcript.length,
      diarizedProvider: asrResults.diarized.metadata.asrLogs[0]?.provider,
      diarizedSegmentsCount: asrResults.diarized.segments.length,
      diarizedTranscriptLength: asrResults.diarized.transcript.length,
    });

    // LLM Merging двух ASR результатов
    const mergedResult = await step.run("llm/merge-asr", async () => {
      const mergeResult = await applyLLMMerging(
        asrResults.nonDiarized,
        asrResults.diarized,
        callId,
      );

      return {
        segments: mergeResult.segments,
        mergedTranscript: mergeResult.mergedTranscript,
        applied: mergeResult.applied,
        qualityScore: mergeResult.quality?.score,
        fallbackReason: mergeResult.fallbackReason,
      };
    });

    // Вычисляем общее время обработки ASR + LLM merge
    const processingTimeMs = Date.now() - asrStartTime;
    
    logger.info("ASR + LLM processing completed", {
      callId,
      processingTimeMs,
      processingTimeSeconds: Math.round(processingTimeMs / 1000 * 100) / 100,
    });

    // Валидация результата
    const validatedResult = await step.run("validate/transcription", async () => {
      const resultForValidation = {
        segments: mergedResult.segments,
        transcript: mergedResult.mergedTranscript,
        normalizedText: mergedResult.mergedTranscript,
        rawText: asrResults.nonDiarized.transcript,
        summary: null,
        sentiment: null,
        title: null,
        callType: null,
        callTopic: null,
        metadata: {
          asrSource: "dual-gigaam-llm-merged",
          asrLogs: [
            ...asrResults.nonDiarized.metadata.asrLogs,
            ...asrResults.diarized.metadata.asrLogs,
          ],
          processingTimeMs,
        },
      };

      const validationResult = TranscriptionResultSchema.safeParse(resultForValidation);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue: ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Transcription result validation failed: ${errorDetails}`);
      }

      return validationResult.data;
    });

    // Идентификация спикеров через LLM
    const identifyResult = await step.run("llm/identify-speakers", async () => {
      const normalizedText = validatedResult.normalizedText || "";
      return identifySpeakers(
        {
          direction: call.direction || "unknown",
          name: call.name,
          workspaceId: call.workspaceId,
        },
        {
          normalizedText,
          metadata: validatedResult.metadata,
        },
        managerNameFromPbx,
      );
    });

    const { text: finalText, customerName, operatorName } = identifyResult;

    // Логирование результатов идентификации
    const originalText = validatedResult.normalizedText || "";
    const debugData = {
      callId,
      finalTextLength: finalText.length,
      originalTextLength: originalText.length,
      customerName,
      operatorName,
      identificationSuccess: identifyResult.metadata?.success || false,
      speakerMapping: identifyResult.metadata?.mapping || {},
      usedEmbeddings: identifyResult.metadata?.usedEmbeddings || false,
      clusterCount: identifyResult.metadata?.clusterCount || 0,
      identificationReason: identifyResult.metadata?.reason,
      llmMergeApplied: mergedResult.applied,
      llmMergeQuality: mergedResult.qualityScore,
      llmMergeFallbackReason: mergedResult.fallbackReason,
    };

    if (identifyResult.metadata?.fallbackAttempted) {
      logger.warn("LLM идентификация спикеров использовала фоллбек", debugData);
    } else {
      logger.info("Speaker identification results", debugData);
    }

    // Сохранение транскрипта
    await step.run("persist/transcript:upsert", async () => {
      const normalizedCallType = validatedResult.callType?.trim() || null;
      const serializedMetadata = serializeMetadata(
        validatedResult.metadata,
        identifyResult.metadata,
        operatorName,
      );

      await callsService.upsertTranscript({
        callId,
        text: finalText,
        rawText: validatedResult.rawText,
        confidence: (typeof validatedResult.metadata.confidence === 'number' ? validatedResult.metadata.confidence : null),
        metadata: {
          ...serializedMetadata,
          dualAsr: {
            nonDiarizedTranscript: asrResults.nonDiarized.transcript,
            diarizedTranscript: asrResults.diarized.transcript,
            llmMergeApplied: mergedResult.applied,
            llmMergeQuality: mergedResult.qualityScore,
            llmMergeFallbackReason: mergedResult.fallbackReason,
          },
        },
        summary: validatedResult.summary,
        sentiment: validatedResult.sentiment,
        title: validatedResult.title,
        callType: normalizedCallType,
        callTopic: validatedResult.callTopic,
        customerName: customerName ?? undefined, // Атомарное обновление с transcript
      });
    });

    await step.sendEvent("event/call.evaluate.requested", evaluateRequested.create({ callId }));

    return {
      callId,
      processingTimeMs: validatedResult.metadata.processingTimeMs,
      asrSource: validatedResult.metadata.asrSource,
      textLength: finalText.length,
      customerName: customerName ?? null,
      llmMergeApplied: mergedResult.applied,
    };
  },
);
