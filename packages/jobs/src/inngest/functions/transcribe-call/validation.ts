/**
 * Функции валидации и обработки ошибок для транскрибации
 */

import { z } from "zod";
import { createLogger } from "~/logger";

const logger = createLogger("transcribe-call-validation");

// Схема для валидации описания workspace
const WorkspaceDescriptionSchema = z
  .string()
  .max(2000, "Описание должно быть не более 2000 символов");

// Схема для валидации workspace для LLM
const _WorkspaceLlmInputSchema = z.object({
  message: z.string().min(1).max(2000, "Сообщение должно быть от 1 до 2000 символов"),
  context: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20, "История диалога не может содержать более 20 сообщений")
    .optional(),
});

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
}): typeof workspace | void {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspace.id)) {
    throw new TranscriptionError(
      `Неверный формат идентификатора рабочего пространства: ${workspace.id}`,
      "INVALID_WORKSPACE_ID",
      "workspace.id",
    );
  }

  // Warn if name is missing (used for LLM context building)
  if (!workspace.name) {
    logger.warn(
      `В рабочем пространстве отсутствует имя, контекст LLM будет ограничен (workspaceId: ${workspace.id})`,
    );
  }

  // Validate and normalize description length (LLM context optimization)
  if (workspace.description) {
    if (workspace.description.length > 2000) {
      // Создаем новый workspace объект с обрезанным описанием
      const originalLength = workspace.description.length;
      const truncatedDescription = workspace.description.slice(0, 2000);

      // Логируем изменение
      logger.warn(
        `Workspace description обрезан с ${originalLength} до 2000 символов (workspaceId: ${workspace.id})`,
      );

      // Возвращаем новый workspace объект с обрезанным описанием
      return {
        ...workspace,
        description: truncatedDescription,
      };
    }

    // Дополнительная валидация контента для LLM
    try {
      WorkspaceDescriptionSchema.parse(workspace.description);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new TranscriptionError(
          `Описание workspace не проходит валидацию: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`,
          "INVALID_WORKSPACE_DESCRIPTION",
          "workspace.description",
        );
      }
      throw error;
    }
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

    // Сохраняем оригинальную ошибку как cause
    const transcriptionError = new TranscriptionError(
      `Внутренняя ошибка в ${context}`,
      "INTERNAL_ERROR",
      context,
    );
    if (error instanceof Error) {
      transcriptionError.cause = error;
    }
    throw transcriptionError;
  });
}

export function createSafeResponse<T>(data: T, errors: ValidationError[] = []) {
  return {
    success: errors.length === 0,
    data,
    errors,
  };
}
