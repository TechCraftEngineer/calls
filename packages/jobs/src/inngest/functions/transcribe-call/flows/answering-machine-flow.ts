/**
 * Flow для обработки автоответчиков
 */

import { callsService } from "@calls/db";
import { createLogger } from "../../../../logger";
import type { AnsweringMachineCheckResult } from "../steps/check-answering-machine";
import type { SyncTranscriptionResult } from "../steps/sync-transcription";

const logger = createLogger("transcribe-call:am-flow");

export interface AnsweringMachineResult {
  callId: string;
  processingTimeMs: number;
  asrSource: string;
  textLength: number;
  customerName: null;
  llmMergeApplied: false;
  isAnsweringMachine: true;
}

export async function handleAnsweringMachineFlow(
  callId: string,
  fullTranscription: SyncTranscriptionResult,
  answeringMachineCheck: AnsweringMachineCheckResult,
): Promise<AnsweringMachineResult> {
  const totalProcessingTimeMs =
    fullTranscription.processingTimeMs + answeringMachineCheck.llmTimeMs;

  // Сохраняем транскрипт автоответчика
  await callsService.upsertTranscript({
    callId,
    text: fullTranscription.transcript,
    rawText: fullTranscription.transcript,
    confidence: null,
    metadata: {
      asrSource: "gigaam-sync-full",
      processingTimeMs: totalProcessingTimeMs,
      isAnsweringMachine: true,
      llmAmCheck: {
        applied: true,
        confidence: answeringMachineCheck.confidence,
        reasoning: answeringMachineCheck.reasoning,
      },
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

  // Добавляем оценку - автоответчик
  await callsService.addEvaluation({
    callId,
    isQualityAnalyzable: false,
    notAnalyzableReason: "autoanswerer",
    valueScore: null,
    valueExplanation: `Автоответчик или голосовое меню (определено через LLM с уверенностью ${answeringMachineCheck.confidence}) - оценка качества менеджера не применима`,
    managerScore: null,
    managerFeedback: "Звонок не подлежит анализу (автоответчик)",
  });

  logger.info("Обработка автоответчика завершена", {
    callId,
    processingTimeMs: totalProcessingTimeMs,
    skippedSteps: [
      "asr:async-diarized",
      "llm/merge-asr",
      "llm/summarize",
      "llm/identify-speakers",
      "call.evaluate.requested",
    ],
  });

  return {
    callId,
    processingTimeMs: totalProcessingTimeMs,
    asrSource: "gigaam-sync-full",
    textLength: fullTranscription.transcript.length,
    customerName: null,
    llmMergeApplied: false,
    isAnsweringMachine: true,
  };
}
