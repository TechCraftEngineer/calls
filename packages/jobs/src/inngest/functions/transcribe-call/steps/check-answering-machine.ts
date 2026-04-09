/**
 * LLM проверка на автоответчик
 */

import { createLogger } from "../../../../logger";
import { isAnsweringMachineWithLlm } from "../answering-machine-llm";
import type { SyncTranscriptionResult } from "./sync-transcription";

const logger = createLogger("transcribe-call:am-check");

export interface AnsweringMachineCheckResult {
  isAnsweringMachine: boolean;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  llmTimeMs: number;
}

export async function checkAnsweringMachine(
  fullTranscription: SyncTranscriptionResult,
  callId: string,
): Promise<AnsweringMachineCheckResult> {
  const llmStartTime = Date.now();
  const result = await isAnsweringMachineWithLlm(fullTranscription.transcript, callId);
  const llmTimeMs = Date.now() - llmStartTime;

  logger.info("LLM проверка на автоответчик завершена", {
    callId,
    isAnsweringMachine: result.isAnsweringMachine,
    confidence: result.confidence,
    llmTimeMs,
  });

  return {
    ...result,
    llmTimeMs,
  };
}
