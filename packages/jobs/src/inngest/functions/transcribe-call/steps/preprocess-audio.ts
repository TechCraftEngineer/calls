/**
 * Предобработка аудио через pipeline
 */

import { filesService } from "@calls/db";
import { runPipelineAudioPreprocess } from "@calls/asr/pipeline/transcribe-pipeline-audio";
import { z } from "zod";
import { createLogger } from "~/logger";
import { FileSchema, PipelineAudioResultSchema } from "~/inngest/functions/transcribe-call/schemas";
import type { Call, PipelineAudioResult } from "~/inngest/functions/transcribe-call/schemas";

const logger = createLogger("transcribe-call:preprocess");

export interface PreprocessResult extends PipelineAudioResult {
  durationSeconds: number | null;
}

export async function preprocessAudio(call: Call, callId: string): Promise<PreprocessResult> {
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
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
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
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Pipeline validation failed: ${errorDetails}`);
  }

  return {
    ...pipelineValidation.data,
    durationSeconds,
  };
}
