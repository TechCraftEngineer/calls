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
import { buildCompanyContext } from "@calls/shared";
import type { ZodIssue } from "zod";
import { shouldSkipExpensiveProcessing } from "../../../evaluation";
import { createLogger } from "../../../logger";
import { evaluateRequested, inngest, transcribeRequested } from "../../client";
import { downloadAudioFile } from "./audio/download";
import { processAudioWithGigaAm } from "./gigaam/client";
import { processAudioWithDiarization } from "./gigaam/diarization";
import { applyLLMMerging } from "./llm-merge";
import { resolveManagerFromPbx } from "./manager-resolution";
import { serializeMetadata } from "./metadata";
import { quickAnsweringMachineCheck, shouldRunQuickCheck } from "./quick-am-check";
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
        // Пытаемся получить callId из разных источников (Inngest может передавать по-разному)
        const rawEventData =
          event.data ||
          (event as unknown as { event?: { data?: { callId?: string } } }).event?.data;
        const eventValidation = TranscribeCallEventSchema.safeParse(rawEventData);

        if (!eventValidation.success) {
          logger.error("Ошибка валидации event в onFailure handler", {
            error: eventValidation.error.message,
            eventData: rawEventData,
            fullEvent: event,
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

      // Сохраняем длительность файла для последующей проверки
      const durationSeconds = f.durationSeconds ?? null;

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

      return {
        ...pipelineValidation.data,
        durationSeconds,
      };
    });

    // Объединяем download и ASR в один шаг для оптимизации
    // Время замеряем внутри step.run для корректности при replay
    const asrResults = await step.run("asr:process", async () => {
      const asrStartTime = Date.now();

      // Загружаем аудио файл
      const { buffer, filename } = await downloadAudioFile(pipelineAudio.preprocessedFileId);

      // === БЫСТРАЯ ПРОВЕРКА НА АВТООТВЕТЧИК ===
      // Проверяем первые 30 секунд для всех звонков
      // Это экономит ресурсы на автоответчиках
      let quickCheck: {
        isAnsweringMachine: boolean;
        transcript: string;
        confidence: "high" | "medium" | "low";
      } | null = null;

      if (shouldRunQuickCheck(pipelineAudio.durationSeconds)) {
        logger.info("Запуск быстрой проверки на автоответчик (первые 30 секунд)", {
          callId,
          durationSeconds: pipelineAudio.durationSeconds,
        });

        try {
          quickCheck = await quickAnsweringMachineCheck(buffer, filename);

          if (quickCheck.isAnsweringMachine) {
            logger.info("Быстрая проверка определила автоответчик", {
              callId,
              confidence: quickCheck.confidence,
              transcriptLength: quickCheck.transcript.length,
            });

            // Это автоответчик - возвращаем результат быстрой проверки
            // Пропускаем дорогие операции (diarization, speaker identification, evaluation)
            return {
              isAnsweringMachine: true as const,
              quickTranscript: quickCheck.transcript,
              processingTimeMs: Date.now() - asrStartTime,
              fromQuickCheck: true as const,
            };
          }

          logger.info("Быстрая проверка: не автоответчик, продолжаем полный pipeline", {
            callId,
            transcriptLength: quickCheck.transcript.length,
            confidence: quickCheck.confidence,
          });
        } catch (quickCheckError) {
          logger.warn("Ошибка быстрой проверки, продолжаем полный pipeline", {
            callId,
            error:
              quickCheckError instanceof Error ? quickCheckError.message : String(quickCheckError),
          });
          // Продолжаем основной pipeline при ошибке быстрой проверки
        }
      } else {
        // Fallback: если логика shouldRunQuickCheck изменится в будущем
        logger.info("Быстрая проверка пропущена, сразу запускаем полный pipeline", {
          callId,
          durationSeconds: pipelineAudio.durationSeconds,
        });
      }

      // Параллельный запуск двух ASR с fallback механизмом
      const [nonDiarizedSettled, diarizedSettled] = await Promise.allSettled([
        processAudioWithGigaAm(buffer, filename),
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
        fromQuickCheck: false as const,
        isAnsweringMachine: false as const,
      };
    });

    // === ОБРАБОТКА БЫСТРОЙ ПРОВЕРКИ ===
    // Если была быстрая проверка и это автоответчик - используем упрощенный pipeline
    if (asrResults.fromQuickCheck && asrResults.isAnsweringMachine) {
      logger.info("Обработка результата быстрой проверки (автоответчик)", {
        callId,
        processingTimeMs: asrResults.processingTimeMs,
      });

      // Сохраняем транскрипт от быстрой проверки
      await step.run("persist/quick-check-transcript", async () => {
        await callsService.upsertTranscript({
          callId,
          text: asrResults.quickTranscript,
          rawText: asrResults.quickTranscript,
          confidence: null,
          metadata: {
            asrSource: "gigaam-non-diarized-quick-check",
            processingTimeMs: asrResults.processingTimeMs,
            isAnsweringMachine: true,
            llmMergeApplied: false,
            llmMergeQuality: null,
            speakerIdentificationApplied: false,
            fromQuickCheck: true,
          },
          summary: null,
          sentiment: null,
          title: "Автоответчик / Голосовое меню",
          callType: "autoanswerer",
          callTopic: null,
          customerName: undefined,
        });
      });

      // Создаём evaluation что звонок не подлежит анализу
      await step.run("persist/quick-check-evaluation", async () => {
        await callsService.addEvaluation({
          callId,
          isQualityAnalyzable: false,
          notAnalyzableReason: "autoanswerer",
          valueScore: null,
          valueExplanation:
            "Автоответчик или голосовое меню (определено по быстрой проверке первых 30 секунд) - оценка качества менеджера не применима",
          managerScore: null,
          managerFeedback: "Звонок не подлежит анализу (автоответчик)",
        });
        logger.info("Создана оценка для автоответчика (быстрая проверка)", { callId });
      });

      logger.info("Обработка автоответчика завершена (быстрая проверка)", {
        callId,
        processingTimeMs: asrResults.processingTimeMs,
        skippedSteps: [
          "llm/merge-asr",
          "llm/summarize",
          "llm/identify-speakers",
          "call.evaluate.requested",
        ],
      });

      return {
        callId,
        processingTimeMs: asrResults.processingTimeMs,
        asrSource: "gigaam-non-diarized-quick-check",
        textLength: asrResults.quickTranscript.length,
        customerName: null,
        llmMergeApplied: false,
        isAnsweringMachine: true,
        fromQuickCheck: true,
      };
    }

    // === ОБЫЧНАЯ ОБРАБОТКА (не быстрая проверка) ===
    // Type guard: проверяем что это обычный ASR результат (не быстрая проверка)
    if (asrResults.fromQuickCheck) {
      // Этот случай уже обработан выше, но TypeScript нужен guard
      throw new Error("Неожиданное значение fromQuickCheck после раннего возврата");
    }

    // Логирование результатов ASR
    logger.info("ASR results", {
      callId,
      nonDiarizedProvider: asrResults.nonDiarized.metadata.asrLogs[0]?.provider,
      nonDiarizedTranscriptLength: asrResults.nonDiarized.transcript.length,
      diarizedProvider: asrResults.diarized.metadata.asrLogs[0]?.provider,
      diarizedSegmentsCount: asrResults.diarized.segments.length,
      diarizedTranscriptLength: asrResults.diarized.transcript.length,
    });

    // Проверка на пустой транскрипт (нет распознанной речи)
    const hasNoSpeech = asrResults.nonDiarized.transcript.trim().length === 0 &&
                       asrResults.diarized.transcript.trim().length === 0;

    if (hasNoSpeech) {
      logger.warn("ASR не распознал речь (пустой транскрипт)", {
        callId,
        processingTimeMs: asrResults.processingTimeMs,
      });

      // Сохраняем пустой транскрипт с меткой
      await step.run("persist/no-speech-transcript", async () => {
        await callsService.upsertTranscript({
          callId,
          text: "",
          rawText: "",
          confidence: null,
          metadata: {
            asrSource: "dual-gigaam-no-speech",
            processingTimeMs: asrResults.processingTimeMs,
            isAnsweringMachine: false,
            llmMergeApplied: false,
            llmMergeQuality: null,
            speakerIdentificationApplied: false,
            noSpeechDetected: true,
          },
          summary: null,
          sentiment: "Не определено",
          title: "Нет распознанной речи",
          callType: "other",
          callTopic: null,
          customerName: undefined,
        });
      });

      // Создаём evaluation что звонок не подлежит анализу
      await step.run("persist/no-speech-evaluation", async () => {
        await callsService.addEvaluation({
          callId,
          isQualityAnalyzable: false,
          notAnalyzableReason: "no_speech_detected",
          valueScore: null,
          valueExplanation: "ASR не распознал речь в аудиофайле - возможно, файл поврежден, слишком тихий или не содержит речи",
          managerScore: null,
          managerFeedback: "Звонок не подлежит анализу (нет распознанной речи)",
        });
        logger.info("Создана оценка для звонка без речи", { callId });
      });

      logger.info("Обработка звонка без речи завершена", {
        callId,
        processingTimeMs: asrResults.processingTimeMs,
        skippedSteps: [
          "llm/merge-asr",
          "llm/summarize",
          "llm/identify-speakers",
          "call.evaluate.requested",
        ],
      });

      return {
        callId,
        processingTimeMs: asrResults.processingTimeMs,
        asrSource: "dual-gigaam-no-speech",
        textLength: 0,
        customerName: null,
        llmMergeApplied: false,
        isAnsweringMachine: false,
      };
    }

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
          valueExplanation:
            "Автоответчик или голосовое меню - оценка качества менеджера не применима",
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
      const companyContext = buildCompanyContext(workspace);
      const result = await summarizeWithLlm(normalizedText, {
        maxChars: 20_000,
        companyContext,
        managerName: managerNameFromPbx,
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

    const finalText = identifyResult.text || "";
    const customerName = (identifyResult as { customerName?: string }).customerName;
    const operatorName = (identifyResult as { operatorName?: string }).operatorName;

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
