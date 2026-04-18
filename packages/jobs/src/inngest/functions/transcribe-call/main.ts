/**
 * Inngest функция: транскрибация звонка по callId.
 * Новая архитектура:
 * 1. Асинхронная полная транскрибация (callback модель, без диаризации)
 * 2. Сохранение транскрипта
 * 3. LLM проверка на автоответчик
 * 4. Если НЕ автоответчик → асинхронная диаризация через speaker-embeddings
 * 5. Асинхронная диаризированная транскрибация
 * 6. LLM merging объединяет результаты
 * 7. Идентификация спикеров через LLM
 */

import type { AsrExecutionLog } from "@calls/asr";
import { callsService, PROCESSING_STATUS } from "@calls/db";
import type { z } from "zod";
import { evaluateRequested, inngest, transcribeRequested } from "../../../client";
import {
  type AsyncTranscriptionResult,
  asyncDiarizedTranscriptionWithCallback,
  asyncTranscriptionWithCallback,
  checkAnsweringMachine,
  type DiarizeResult,
  fetchCall,
  fetchWorkspace,
  handleFailure,
  type IdentifyResult,
  identifySpeakers,
  type MergeResult,
  mergeResults,
  persistResults,
  preprocessAudio,
  resolveManager,
  type SummarizeResult,
  speakerDiarizationWithCallback,
  summarize,
  validateInput,
} from "../../../inngest/functions/transcribe-call/steps";
import type { StepRunner } from "../../../inngest/functions/transcribe-call/steps/step-runner";
import type { GigaAmSegment } from "../../../inngest/functions/transcribe-call/types";
import { createLogger } from "../../../logger";
import {
  handleAnsweringMachineFlow,
  handleNoSpeechFlow,
} from "../../functions/transcribe-call/flows";
import type { Call } from "../../functions/transcribe-call/schemas";
import { TranscriptionResultSchema } from "../../functions/transcribe-call/schemas";

const logger = createLogger("transcribe-call");

/**
 * Type guard для Inngest step - преобразует Inngest step в типизированный StepRunner.
 * Выполняет runtime проверку обязательных методов.
 */
function ensureStepRunner(step: unknown): StepRunner {
  if (step === null || typeof step !== "object") {
    throw new Error("Invalid step: expected object, got " + typeof step);
  }

  const s = step as Record<string, unknown>;

  // Проверяем наличие и тип методов run и waitForEvent
  if (typeof s.run !== "function") {
    throw new Error("Invalid step: missing or invalid 'run' method");
  }
  if (typeof s.waitForEvent !== "function") {
    throw new Error("Invalid step: missing or invalid 'waitForEvent' method");
  }

  return step as StepRunner;
}

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация: Async Full + LLM AM Check + Async Diarization",
    retries: 2,
    // limit: 1 с ключом callId означает сериализацию обработки одного конкретного звонка.
    // Разные callId обрабатываются параллельно, поэтому общая пропускная способность не страдает.
    // Снижение с 3 до 1 предотвращает race conditions при ретраях и упрощает отладку.
    concurrency: {
      limit: 1,
      key: "event.data.callId",
    },
    triggers: [transcribeRequested],
    onFailure: handleFailure,
  },
  async ({ event, step }) => {
    const { callId } = event.data;

    // === ШАГ 0: Установка статуса обработки ===
    await step.run("db/calls:update-processing-status", () =>
      callsService.updateCallProcessingStatus(callId, PROCESSING_STATUS.TRANSCRIBING, {
        startedAt: new Date(),
        error: null, // Очищаем предыдущую ошибку при ретрае
      }),
    );

    // === ШАГ 1: Валидация входных данных ===
    await step.run("validate/input", () => validateInput(callId));

    // === ШАГ 2: Получение данных звонка ===
    const call = await step.run("db/calls:get", () => fetchCall(callId));

    // === ШАГ 3: Получение и валидация workspace ===
    const workspace = await step.run("db/workspaces:get", () =>
      fetchWorkspace(call.workspaceId, callId),
    );

    // === ШАГ 4: Определение менеджера из PBX ===
    const managerNameFromPbx = await step.run("pbx/manager:resolve", () => resolveManager(call));

    // === ШАГ 5: Предобработка аудио ===
    const pipelineAudio = await step.run("pipeline/audio:preprocess", () =>
      preprocessAudio(call, callId),
    );

    // === ШАГ 6: Асинхронная полная транскрибация (callback модель) ===
    const fullTranscription = await asyncTranscriptionWithCallback(
      pipelineAudio,
      callId,
      ensureStepRunner(step),
    );

    // Сохраняем для использования в fallback
    const fullTranscript = fullTranscription.transcript;

    // === Проверка: Пустой транскрипт ===
    if (!fullTranscript || fullTranscript.trim().length === 0) {
      return await step.run("flow/no-speech", () => handleNoSpeechFlow(callId, fullTranscription));
    }

    // === ШАГ 7: LLM проверка на автоответчик ===
    const answeringMachineCheck = await step.run("llm/check-answering-machine", () =>
      checkAnsweringMachine(fullTranscription, callId),
    );

    // === Проверка: Автоответчик ===
    if (answeringMachineCheck.isAnsweringMachine) {
      return await step.run("flow/answering-machine", () =>
        handleAnsweringMachineFlow(callId, fullTranscription, answeringMachineCheck),
      );
    }

    // === ШАГ 8: Диаризация через Speaker Embeddings (асинхронная) ===
    const speakerDiarizationResult = await speakerDiarizationWithCallback(
      pipelineAudio,
      callId,
      fullTranscription.segments || [],
      ensureStepRunner(step),
    );

    logger.info("Результат диаризации Speaker Embeddings", {
      callId,
      success: speakerDiarizationResult.success,
      skipped: speakerDiarizationResult.skipped,
      usedEmbeddings: speakerDiarizationResult.usedEmbeddings,
      clusterCount: speakerDiarizationResult.clusterCount,
    });

    // === ШАГ 9: Асинхронная диаризированная транскрибация ===
    let diarizeResult: Awaited<ReturnType<typeof asyncDiarizedTranscriptionWithCallback>>;
    try {
      // Используем сегменты из speaker-embeddings диаризации, если они есть
      // Иначе используем сегменты из обычной транскрипции
      const rawSpeakerSegments = speakerDiarizationResult.segments
        ? speakerDiarizationResult.segments.map((s) => ({
            speaker: s.speaker,
            start: s.start,
            end: s.end,
            text: "", // Текст не нужен для giga-am диаризации
          }))
        : fullTranscription.segments || [];

      // Объединяем последовательные сегменты одного спикера ДО отправки в GigaAM.
      // skipEmptyText=false — т.к. text пустой намеренно, пропускать нельзя.
      // Это увеличивает акустический контекст каждого фрагмента → выше качество ASR.
      const { mergeConsecutiveSpeakerSegments } = await import(
        "./steps/merge-consecutive-segments"
      );
      const segmentsForDiarization = mergeConsecutiveSpeakerSegments(
        rawSpeakerSegments,
        callId,
        false, // skipEmptyText=false: объединяем даже пустые сегменты
      );

      // Проверяем, что есть сегменты для диаризации
      if (!segmentsForDiarization || segmentsForDiarization.length === 0) {
        logger.warn("Нет сегментов для диаризированной транскрипции, используем fallback", {
          callId,
          hasSpeakerSegments: !!speakerDiarizationResult.segments,
          hasFullTranscriptionSegments: !!(
            fullTranscription.segments && fullTranscription.segments.length > 0
          ),
        });
        throw new Error("Нет сегментов для диаризации");
      }

      diarizeResult = await asyncDiarizedTranscriptionWithCallback(
        pipelineAudio,
        callId,
        segmentsForDiarization,
        ensureStepRunner(step),
      );
    } catch (diarizationError) {
      logger.error(
        "Диаризированная транскрипция завершилась с ошибкой, используем fallback на обычную транскрипцию",
        {
          callId,
          error:
            diarizationError instanceof Error ? diarizationError.message : String(diarizationError),
        },
      );

      // Fallback: создаём объект результата на основе обычной транскрипции
      diarizeResult = {
        transcript: fullTranscription.transcript,
        segments: fullTranscription.segments || [],
        processingTimeMs: fullTranscription.processingTimeMs || 0,
        taskId: "",
        diarizationFailed: true,
      } as Awaited<ReturnType<typeof asyncDiarizedTranscriptionWithCallback>>;
    }

    // === ШАГ 10: LLM Merging результатов ===
    // Если диаризация не удалась, пропускаем мерджинг и используем обычную транскрипцию
    let mergedResult: MergeResult;
    if (diarizeResult.diarizationFailed || !diarizeResult.segments) {
      logger.info("Диаризация не удалась, используем обычную транскрипцию без мерджинга", {
        callId,
      });

      mergedResult = {
        segments: fullTranscription.segments || [],
        mergedTranscript: fullTranscription.transcript || "",
        applied: false,
        qualityScore: null,
        llmMergeTimeMs: 0,
      };
    } else {
      mergedResult = await step.run("llm/merge-asr", () =>
        mergeResults(fullTranscription, diarizeResult as DiarizeResult, callId, workspace),
      );
    }

    // Вычисляем общее время обработки с дефолтными значениями
    const totalProcessingTimeMs =
      (fullTranscription.processingTimeMs || 0) +
      (diarizeResult.processingTimeMs || 0) +
      (mergedResult.llmMergeTimeMs || 0);

    logger.info("ASR + LLM processing completed", {
      callId,
      processingTimeMs: totalProcessingTimeMs,
      fullTranscriptionTimeMs: fullTranscription.processingTimeMs || 0,
      diarizationTimeMs: diarizeResult.processingTimeMs || 0,
      llmMergeTimeMs: mergedResult.llmMergeTimeMs,
      processingTimeSeconds: Math.round((totalProcessingTimeMs / 1000) * 100) / 100,
    });

    // === ШАГ 11: Валидация результата ===
    const validatedResult = await step.run("validate/transcription", () => {
      // Фильтруем сегменты с пустым текстом (или только пробелами)
      const nonEmptySegments = mergedResult.segments.filter(
        (s: { text: string; speaker: string; start: number; end: number }) =>
          s.text && s.text.trim().length > 0,
      );

      if (nonEmptySegments.length < mergedResult.segments.length) {
        logger.info("Отфильтрованы пустые сегменты", {
          callId,
          originalCount: mergedResult.segments.length,
          filteredCount: nonEmptySegments.length,
          removedCount: mergedResult.segments.length - nonEmptySegments.length,
        });
      }

      // Fallback: если все сегменты пустые, используем исходный текст
      let diarizedText: string;
      if (nonEmptySegments.length === 0) {
        logger.warn("Все сегменты пустые после фильтрации, используем fallback", {
          callId,
          originalTextLength: fullTranscription.transcript?.length ?? 0,
        });
        diarizedText = fullTranscription.transcript || "[нет распознаваемой речи]";
      } else {
        diarizedText = nonEmptySegments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
      }

      // Создаем asrLogs на основе всех этапов обработки
      const asrLogs = [
        {
          provider: "gigaam-async-full" as const,
          success: true,
          utterances: (fullTranscription.segments || []).map((s: GigaAmSegment) => ({
            text: s.text,
            start: s.start,
            end: s.end,
            speaker: s.speaker,
          })),
          raw: fullTranscription,
        },
        {
          provider: (diarizeResult.diarizationFailed
            ? "gigaam-async-diarized-fallback"
            : "gigaam-async-diarized") as
            | "gigaam-async-diarized-fallback"
            | "gigaam-async-diarized",
          success: !diarizeResult.diarizationFailed,
          utterances: (diarizeResult.segments || []).map((s: GigaAmSegment) => ({
            text: s.text,
            start: s.start,
            end: s.end,
            speaker: s.speaker,
          })),
          raw: diarizeResult,
        },
      ];

      const resultForValidation = {
        segments: nonEmptySegments,
        transcript: diarizedText,
        normalizedText: diarizedText,
        rawText: fullTranscription.transcript,
        summary: null,
        sentiment: null,
        title: null,
        callType: null,
        callTopic: null,
        metadata: {
          asrSource: "gigaam-sync-full-async-diarized-llm-merged",
          processingTimeMs: totalProcessingTimeMs,
          asrLogs,
        },
      };

      const validationResult = TranscriptionResultSchema.safeParse(resultForValidation);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Transcription result validation failed: ${errorDetails}`);
      }

      return validationResult.data;
    });

    const normalizedText = validatedResult.normalizedText || "";
    const rawText = validatedResult.rawText || "";

    // === ШАГ 12: Генерация summary ===
    const summaryResult = await step.run("llm/summarize", () =>
      summarize(rawText, workspace, managerNameFromPbx, callId),
    );

    // === ШАГ 13: Идентификация спикеров ===
    const identifyResult = await step.run("llm/identify-speakers", () =>
      identifySpeakers(
        call,
        normalizedText,
        validatedResult.metadata.asrLogs as unknown as AsrExecutionLog[],
        managerNameFromPbx,
        summaryResult.summary || undefined,
      ),
    );

    // === ШАГ 14: Обновление статуса на transcribed ===
    await step.run("db/calls:update-status-transcribed", () =>
      callsService.updateCallProcessingStatus(callId, PROCESSING_STATUS.TRANSCRIBED),
    );

    // === ШАГ 15: Сохранение результатов ===
    await step.run("persist/transcript:upsert", () =>
      persistResults({
        call,
        finalText: identifyResult.text,
        rawText: fullTranscription.transcript,
        mergedResult,
        summaryResult,
        identifyResult,
        totalProcessingTimeMs,
        asrSource: "gigaam-sync-full-async-diarized-llm-merged",
        confidence:
          typeof validatedResult.metadata.confidence === "number"
            ? validatedResult.metadata.confidence
            : null,
        asrLogs: validatedResult.metadata.asrLogs,
      }),
    );

    // === ШАГ 16: Отправка события на оценку ===
    await step.sendEvent("event/call.evaluate.requested", evaluateRequested.create({ callId }));

    return {
      callId,
      processingTimeMs: totalProcessingTimeMs,
      asrSource: "gigaam-sync-full-async-diarized-llm-merged",
      textLength: identifyResult.text.length,
      customerName: identifyResult.customerName ?? null,
      llmMergeApplied: mergedResult.applied,
    };
  },
);
