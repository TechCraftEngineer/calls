/**
 * Flow для обработки звонков без распознанной речи
 */

import { callsService, PROCESSING_STATUS } from "@calls/db";
import { createLogger } from "../../../../logger";
import type { SyncTranscriptionResult } from "../steps/sync-transcription";

const logger = createLogger("transcribe-call:no-speech-flow");

export interface NoSpeechResult {
  callId: string;
  processingTimeMs: number;
  asrSource: string;
  textLength: 0;
  customerName: null;
  llmMergeApplied: false;
  isAnsweringMachine: false;
}

export async function handleNoSpeechFlow(
  callId: string,
  fullTranscription: SyncTranscriptionResult,
): Promise<NoSpeechResult> {
  logger.warn("ASR не распознал речь (пустой транскрипт)", {
    callId,
    processingTimeMs: fullTranscription.processingTimeMs,
  });

  // Сохраняем пустой транскрипт
  await callsService.upsertTranscript({
    callId,
    text: "",
    rawText: "",
    confidence: null,
    metadata: {
      asrSource: "gigaam-sync-full",
      processingTimeMs: fullTranscription.processingTimeMs,
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

  // Добавляем оценку - звонок не подлежит анализу
  await callsService.addEvaluation({
    callId,
    isQualityAnalyzable: false,
    notAnalyzableReason: "no_speech_detected",
    valueScore: null,
    valueExplanation:
      "ASR не распознал речь в аудиофайле - возможно, файл поврежден, слишком тихий или не содержит речи",
    managerScore: null,
    managerFeedback: "Звонок не подлежит анализу (нет распознанной речи)",
  });

  // Устанавливаем финальный статус обработки
  await callsService.updateCallProcessingStatus(callId, PROCESSING_STATUS.COMPLETED, {
    completedAt: new Date(),
  });

  return {
    callId,
    processingTimeMs: fullTranscription.processingTimeMs,
    asrSource: "gigaam-sync-full",
    textLength: 0,
    customerName: null,
    llmMergeApplied: false,
    isAnsweringMachine: false,
  };
}
