/**
 * Inngest функция: транскрибация звонка по callId.
 * Архитектура:
 * 1. ASR без диаризации (точный текст)
 * 2. ASR с диаризацией (разделение по спикерам)
 * 3. Проверка на автоответчик (пропуск дорогих операций если это автоответчик)
 * 4. LLM merging объединяет оба результата (только для не-автоответчиков)
 * 5. Идентификация спикеров через LLM (только для не-автоответчиков)
 */

import { summarizeWithLlm } from "@calls/asr/llm/summarize";
import { runPipelineAudioPreprocess } from "@calls/asr/pipeline/transcribe-pipeline-audio";
import { callsService, filesService, workspacesService } from "@calls/db";
import type { ZodIssue } from "zod";
import { createLogger } from "../../../logger";
import { shouldSkipExpensiveProcessing } from "../../../evaluation";
import { evaluateRequested, inngest, transcribeRequested } from "../../client";
import { downloadAudioFile } from "./audio/download";
import { processAudioWithoutDiarization } from "./gigaam/client";
import { processAudioWithDiarization } from "./gigaam/diarization";
import { applyLLMMerging } from "./llm-merge";
import { resolveManagerFromPbx } from "./manager-resolution";
import { serializeMetadata } from "./metadata";
import {
  CallSchema,
  FileSchema,
  PipelineAudioResultSchema,
  TranscribeCallEventSchema,
  TranscriptionResultSchema,
  WorkspaceSchema,
} from "./schemas";
import { identifySpeakers } from "./speaker-identification";
import type { AsrResult } from "./types";
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

    // Шаг валидации workspace - выполняется только для проверки существования и валидности
    const _workspaceValidation = await step.run("db/workspaces:get", async () => {
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
    // Время замеряем внутри step.run для корректности при replay
    const asrResults = await step.run("asr:process", async () => {
      const asrStartTime = Date.now();

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
      const nonDiarizedResult: AsrResult =
        nonDiarizedSettled.status === "fulfilled"
          ? nonDiarizedSettled.value
          : diarizedSettled.status === "fulfilled"
            ? diarizedSettled.value
            : (() => {
                throw new Error("Нет доступных ASR результатов для non-diarized");
              })();

      const diarizedResult: AsrResult =
        diarizedSettled.status === "fulfilled"
          ? diarizedSettled.value
          : nonDiarizedSettled.status === "fulfilled"
            ? nonDiarizedSettled.value
            : (() => {
                throw new Error("Нет доступных ASR результатов для diarized");
              })();

      // Логируем fallback ситуации
      if (nonDiarizedSettled.status === "rejected" || diarizedSettled.status === "rejected") {
        logger.warn("ASR fallback активирован", {
          callId,
          nonDiarizedFailed: nonDiarizedSettled.status === "rejected",
          diarizedFailed: diarizedSettled.status === "rejected",
        });
      }

      const processingTimeMs = Date.now() - asrStartTime;

      return {
        nonDiarized: nonDiarizedResult,
        diarized: diarizedResult,
        processingTimeMs,
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

    // Проверка на автоответчик сразу после базового ASR
    // Это позволяет пропустить дорогие операции (diarization, speaker identification, evaluation)
    const isAnsweringMachine = await step.run("detect/answering-machine", async () => {
      const shouldSkip = await shouldSkipExpensiveProcessing(asrResults.nonDiarized.transcript);
      logger.info("Проверка автоответчика", {
        callId,
        isAnsweringMachine: shouldSkip,
        transcriptLength: asrResults.nonDiarized.transcript.length,
      });
      return shouldSkip;
    });

    // Если это автоответчик - используем упрощённый pipeline
    if (isAnsweringMachine) {
      const answeringMachineProcessingTimeMs = asrResults.processingTimeMs;

      // Сохраняем упрощённый transcript без speaker identification
      await step.run("persist/answering-machine", async () => {
        await callsService.upsertTranscript({
          callId,
          text: asrResults.nonDiarized.transcript,
          rawText: asrResults.nonDiarized.transcript,
          confidence: null, // ASR без диаризации не предоставляет confidence
          metadata: {
            asrSource: "gigaam-non-diarized",
            processingTimeMs: answeringMachineProcessingTimeMs,
            isAnsweringMachine: true,
            llmMergeApplied: false,
            llmMergeQuality: null,
            speakerIdentificationApplied: false,
          },
          summary: null,
          sentiment: null,
          title: "Автоответчик / Голосовое меню",
          callType: "autoanswerer",
          callTopic: null,
          customerName: undefined,
        });
      });

      // Сразу создаём evaluation что звонок не подлежит анализу
      await step.run("persist/autoanswerer-evaluation", async () => {
        await callsService.addEvaluation({
          callId,
          isQualityAnalyzable: false,
          notAnalyzableReason: "autoanswerer",
          valueScore: null,
          valueExplanation: "Автоответчик или голосовое меню - оценка качества менеджера не применима",
          managerScore: null,
          managerFeedback: "Звонок не подлежит анализу (автоответчик)",
        });
        logger.info("Создана оценка для автоответчика", { callId });
      });

      logger.info("Обработка автоответчика завершена (упрощённый pipeline)", {
        callId,
        processingTimeMs: answeringMachineProcessingTimeMs,
        skippedSteps: [
          "llm/merge-asr",
          "llm/summarize",
          "llm/identify-speakers",
          "call.evaluate.requested",
        ],
      });

      return {
        callId,
        processingTimeMs: answeringMachineProcessingTimeMs,
        asrSource: "gigaam-non-diarized",
        textLength: asrResults.nonDiarized.transcript.length,
        customerName: null,
        llmMergeApplied: false,
        isAnsweringMachine: true,
      };
    }

    // LLM Merging двух ASR результатов (только для не-автоответчиков)
    const mergedResult = await step.run("llm/merge-asr", async () => {
      const llmMergeStartTime = Date.now();
      const mergeResult = await applyLLMMerging(
        asrResults.nonDiarized,
        asrResults.diarized,
        callId,
      );
      const llmMergeTimeMs = Date.now() - llmMergeStartTime;

      return {
        segments: mergeResult.segments,
        mergedTranscript: mergeResult.mergedTranscript,
        applied: mergeResult.applied,
        qualityScore: mergeResult.quality?.score,
        fallbackReason: mergeResult.fallbackReason,
        llmMergeTimeMs,
      };
    });

    // Вычисляем общее время обработки
    const llmMergeTimeMs = mergedResult.llmMergeTimeMs;
    const totalProcessingTimeMs = asrResults.processingTimeMs + llmMergeTimeMs;

    logger.info("ASR + LLM processing completed", {
      callId,
      processingTimeMs: totalProcessingTimeMs,
      asrProcessingTimeMs: asrResults.processingTimeMs,
      llmMergeTimeMs,
      processingTimeSeconds: Math.round((totalProcessingTimeMs / 1000) * 100) / 100,
    });

    // Валидация результата
    const validatedResult = await step.run("validate/transcription", async () => {
      // Строим диаризированный текст из сегментов с метками спикеров
      const diarizedText = mergedResult.segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");

      const resultForValidation = {
        segments: mergedResult.segments,
        transcript: diarizedText,
        normalizedText: diarizedText,
        rawText: asrResults.nonDiarized.transcript,
        summary: null,
        sentiment: null,
        title: null,
        callType: null,
        callTopic: null,
        metadata: {
          asrSource: "dual-gigaam-llm-merged",
          processingTimeMs: totalProcessingTimeMs,
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

    const normalizedText = validatedResult.normalizedText || "";

    // Генерация summary через LLM (ДО идентификации спикеров)
    const summaryResult = await step.run("llm/summarize", async () => {
      const summarizeStartTime = Date.now();
      const result = await summarizeWithLlm(normalizedText, {
        maxChars: 20_000,
      });
      const summarizeTimeMs = Date.now() - summarizeStartTime;

      logger.info("LLM summarization completed", {
        callId,
        summarizeTimeMs,
        hasSummary: !!result.summary,
        sentiment: result.sentiment,
        title: result.title,
      });

      return {
        ...result,
        summarizeTimeMs,
      };
    });

    // Идентификация спикеров через LLM (с использованием summary для лучшей точности)
    const identifyResult = await step.run("llm/identify-speakers", async () => {
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
        summaryResult.summary || undefined,
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
      const serializedMetadata = serializeMetadata(
        validatedResult.metadata,
        identifyResult.metadata,
        operatorName,
      );

      await callsService.upsertTranscript({
        callId,
        text: finalText,
        rawText: validatedResult.rawText,
        confidence:
          typeof validatedResult.metadata.confidence === "number"
            ? validatedResult.metadata.confidence
            : null,
        metadata: {
          ...serializedMetadata,
          processingTimeMs: totalProcessingTimeMs,
          llmMergeApplied: mergedResult.applied,
          llmMergeQuality: mergedResult.qualityScore,
        },
        summary: summaryResult.summary,
        sentiment: summaryResult.sentiment,
        title: summaryResult.title,
        callType: summaryResult.callType ?? null,
        callTopic: summaryResult.callTopic ?? null,
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
