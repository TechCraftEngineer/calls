/**
 * Inngest функция: транскрибация звонка по callId.
 * Новая архитектура:
 * 1. Асинхронная полная транскрибация (callback модель, без диаризации)
 * 2. Сохранение транскрипта
 * 3. LLM проверка на автоответчик
 * 4. Если НЕ автоответчик → асинхронная диаризированная транскрибация
 * 5. LLM merging объединяет результаты
 * 6. Идентификация спикеров через LLM
 */

import { createLogger } from "~/logger";
import { evaluateRequested, inngest, transcribeRequested } from "~/inngest/client";
import {
  handleAnsweringMachineFlow,
  handleNoSpeechFlow,
} from "~/inngest/functions/transcribe-call/flows";
import {
  asyncTranscriptionWithCallback,
  checkAnsweringMachine,
  fetchCall,
  fetchWorkspace,
  handleFailure,
  identifySpeakers,
  mergeResults,
  persistResults,
  preprocessAudio,
  resolveManager,
  summarize,
  validateInput,
} from "~/inngest/functions/transcribe-call/steps";
import { TranscriptionResultSchema } from "~/inngest/functions/transcribe-call/schemas";
import type { ZodIssue } from "zod";
import type { AsyncTranscriptionResult } from "~/inngest/functions/transcribe-call/steps/async-transcription";
import type { MergeResult } from "~/inngest/functions/transcribe-call/steps/merge-results";
import type { SummarizeResult } from "~/inngest/functions/transcribe-call/steps/summarize";
import type { IdentifyResult } from "~/inngest/functions/transcribe-call/steps/identify-speakers";
import type { Call } from "~/inngest/functions/transcribe-call/schemas";

const logger = createLogger("transcribe-call");

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация: Async Full + LLM AM Check + Async Diarization",
    retries: 2,
    concurrency: {
      limit: 3,
      key: "event.data.callId",
    },
    triggers: [transcribeRequested],
    onFailure: handleFailure,
  },
  async ({ event, step }) => {
    const { callId } = event.data;

    // === ШАГ 1: Валидация входных данных ===
    await step.run("validate/input", () => validateInput(callId));

    // === ШАГ 2: Получение данных звонка ===
    const call = await step.run("db/calls:get", () => fetchCall(callId)) as Call;

    // === ШАГ 3: Получение и валидация workspace ===
    const workspace = await step.run("db/workspaces:get", () =>
      fetchWorkspace(call.workspaceId, callId),
    );

    // === ШАГ 4: Определение менеджера из PBX ===
    const managerNameFromPbx = await step.run("pbx/manager:resolve", () =>
      resolveManager(call),
    );

    // === ШАГ 5: Предобработка аудио ===
    const pipelineAudio = await step.run("pipeline/audio:preprocess", () =>
      preprocessAudio(call, callId),
    );

    // === ШАГ 6: Асинхронная полная транскрибация (callback модель) ===
    const fullTranscription = await asyncTranscriptionWithCallback(
      pipelineAudio,
      callId,
      step,
    ) as AsyncTranscriptionResult;

    // Сохраняем для использования в fallback
    const fullTranscript = fullTranscription.transcript;
    const fullProcessingTimeMs = fullTranscription.processingTimeMs;

    // === Проверка: Пустой транскрипт ===
    if (!fullTranscript || fullTranscript.trim().length === 0) {
      return await step.run("flow/no-speech", () =>
        handleNoSpeechFlow(callId, fullTranscription),
      );
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

    // === ШАГ 8: Диаризация и асинхронная транскрибация (УБРАНО - асинхронная модель) ===
    // const diarizeResult = await step.run("asr:diarize-and-transcribe", () =>
    //   diarizeAndTranscribe(pipelineAudio, callId),
    // ) as DiarizeResult;

    // Временно используем синхронный результат без диаризации
    const diarizeResult = {
      segments: [],
      transcript: fullTranscription.transcript,
      processingTimeMs: 0,
      diarizationSuccess: false,
      diarizationFailed: true,
    };

    // === ШАГ 9: LLM Merging (упрощенный - без диаризации) ===
    const mergedResult = await step.run("llm/merge-asr", () =>
      mergeResults(fullTranscription, diarizeResult, callId),
    ) as MergeResult;

    // Вычисляем общее время обработки с дефолтными значениями
    const totalProcessingTimeMs =
      (fullTranscription.processingTimeMs || 0) +
      (diarizeResult.processingTimeMs || 0) +
      (mergedResult.llmMergeTimeMs || 0);

    logger.info("ASR + LLM processing completed", {
      callId,
      processingTimeMs: totalProcessingTimeMs,
      asrProcessingTimeMs: (fullTranscription.processingTimeMs || 0) + (diarizeResult.processingTimeMs || 0),
      llmMergeTimeMs: mergedResult.llmMergeTimeMs,
      processingTimeSeconds: Math.round((totalProcessingTimeMs / 1000) * 100) / 100,
    });

    // === ШАГ 10: Валидация результата ===
    const validatedResult = await step.run("validate/transcription", () => {
      const diarizedText = mergedResult.segments
        .map((s: { speaker: string; text: string }) => `${s.speaker}: ${s.text}`)
        .join("\n");

      const resultForValidation = {
        segments: mergedResult.segments,
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
          asrLogs: [],
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

    // === ШАГ 11: Генерация summary ===
    const summaryResult = await step.run("llm/summarize", () =>
      summarize(normalizedText, workspace, managerNameFromPbx, callId),
    ) as SummarizeResult;

    // === ШАГ 12: Идентификация спикеров ===
    const identifyResult = await step.run("llm/identify-speakers", () =>
      identifySpeakers(
        call,
        normalizedText,
        validatedResult.metadata.asrLogs || [],
        managerNameFromPbx,
        summaryResult.summary || undefined,
      ),
    ) as IdentifyResult;

    // === ШАГ 13: Сохранение результатов ===
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
      }),
    );

    // === ШАГ 14: Отправка события на оценку ===
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
