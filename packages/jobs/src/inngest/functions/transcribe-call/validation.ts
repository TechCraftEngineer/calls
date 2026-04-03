/**
 * Функции валидации и обработки ошибок для транскрибации
 */

import { createLogger } from "../../../logger";

const logger = createLogger("transcribe-call-validation");

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export function validateCallId(callId: unknown): string {
  if (!callId || typeof callId !== "string") {
    throw new TranscriptionError(
      "callId обязателен и должен быть строкой",
      "INVALID_CALL_ID",
      "callId",
    );
  }

  if (callId.trim().length === 0) {
    throw new TranscriptionError("callId не может быть пустым", "EMPTY_CALL_ID", "callId");
  }

  return callId.trim();
}

export function validateCall(call: {
  id: string;
  workspaceId: string;
  fileId?: string | null;
  internalNumber?: string | null;
  direction?: string | null;
  name?: string | null;
}): void {
  if (!call.fileId) {
    throw new TranscriptionError(
      `У звонка ${call.id} нет привязанного файла`,
      "MISSING_FILE_ID",
      "fileId",
    );
  }

  if (!call.workspaceId) {
    throw new TranscriptionError(
      `У звонка ${call.id} не указан workspaceId`,
      "MISSING_WORKSPACE_ID",
      "workspaceId",
    );
  }
}

export function validateWorkspace(workspace: {
  id: string;
  name?: string | null;
  description?: string | null;
}): void {
  if (!workspace.id) {
    throw new TranscriptionError("Workspace не найден", "WORKSPACE_NOT_FOUND", "workspace");
  }
}

export function validateFile(file: {
  id: string;
  storageKey?: string | null;
  filename?: string | null;
}): void {
  if (!file.storageKey) {
    throw new TranscriptionError(
      `У файла ${file.id} отсутствует storageKey`,
      "MISSING_STORAGE_KEY",
      "storageKey",
    );
  }
}

export function validatePipelineResult(result: { preprocessedFileId?: string | null }): void {
  if (!result.preprocessedFileId) {
    throw new TranscriptionError(
      "Pipeline не вернул preprocessedFileId",
      "MISSING_PREPROCESSED_FILE",
      "preprocessedFileId",
    );
  }
}

export function validateTranscriptionResult(result: {
  segments?: unknown[];
  transcript?: string;
  metadata?: {
    asrLogs?: Array<{
      provider: string;
      utterances?: unknown[];
      raw?: unknown;
    }>;
  };
}): void {
  if (!result.segments || !Array.isArray(result.segments)) {
    throw new TranscriptionError(
      "ASR результат не содержит сегментов",
      "MISSING_SEGMENTS",
      "segments",
    );
  }

  if (!result.transcript || typeof result.transcript !== "string") {
    throw new TranscriptionError(
      "ASR результат не содержит транскрипта",
      "MISSING_TRANSCRIPT",
      "transcript",
    );
  }

  if (!result.metadata?.asrLogs?.length) {
    logger.warn("ASR результат не содержит логов", {
      metadata: result.metadata,
    });
  }
}

export function handleAsyncError<T>(operation: () => Promise<T>, context: string): Promise<T> {
  return operation().catch((error) => {
    logger.error(`Ошибка в ${context}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof TranscriptionError) {
      throw error;
    }

    throw new TranscriptionError(`Внутренняя ошибка в ${context}`, "INTERNAL_ERROR", context);
  });
}

export function createSafeResponse<T>(data: T, errors: ValidationError[] = []) {
  return {
    success: errors.length === 0,
    data,
    errors,
  };
}
