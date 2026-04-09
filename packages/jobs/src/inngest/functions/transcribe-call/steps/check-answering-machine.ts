/**
 * LLM проверка на автоответчик
 */

import { z } from "zod";
import { isAnsweringMachineWithLlm } from "~/inngest/functions/transcribe-call/llm/answering-machine";
import { createLogger } from "~/logger";
import type { SyncTranscriptionResult } from "./sync-transcription";

const logger = createLogger("transcribe-call:am-check");

// Zod схема для валидации transcript
const TranscriptSchema = z
  .string()
  .min(1, "Транскрипт не может быть пустым")
  .max(2000, "Транскрипт слишком длинный (максимум 2000 символов)");

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
  // Обрезаем transcript до 2000 символов если он длиннее
  const truncatedTranscript =
    fullTranscription.transcript.length > 2000
      ? fullTranscription.transcript.slice(0, 2000)
      : fullTranscription.transcript;

  // Валидация transcript через Zod
  const validationResult = TranscriptSchema.safeParse(truncatedTranscript);
  if (!validationResult.success) {
    logger.error("Валидация transcript не прошла", {
      callId,
      issues: validationResult.error.issues,
      originalLength: fullTranscription.transcript.length,
    });

    // При ошибке валидации считаем что это НЕ автоответчик (безопасный fallback)
    return {
      isAnsweringMachine: false,
      confidence: "low",
      reasoning: `Ошибка валидации transcript: ${validationResult.error.issues.map((issue: z.ZodIssue) => issue.message).join(", ")}`,
      llmTimeMs: 0,
    };
  }

  const validatedTranscript = validationResult.data;

  const llmStartTime = Date.now();
  const result = await isAnsweringMachineWithLlm(validatedTranscript, callId);
  const llmTimeMs = Date.now() - llmStartTime;

  logger.info("LLM проверка на автоответчик завершена", {
    callId,
    isAnsweringMachine: result.isAnsweringMachine,
    confidence: result.confidence,
    llmTimeMs,
    transcriptLength: validatedTranscript.length,
    wasTruncated: fullTranscription.transcript.length > 2000,
  });

  return {
    ...result,
    llmTimeMs,
  };
}
