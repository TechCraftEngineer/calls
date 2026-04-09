/**
 * Получение и валидация данных workspace из БД
 */

import { workspacesService } from "@calls/db";
import type { z } from "zod";
import { createLogger } from "../../../../logger";
import type { Workspace } from "../schemas";
import { WorkspaceSchema } from "../schemas";
import { validateWorkspace } from "../utils/validation";

const logger = createLogger("transcribe-call:fetch-workspace");

export async function fetchWorkspace(workspaceId: string, callId: string): Promise<Workspace> {
  const ws = await workspacesService.getById(workspaceId);
  if (!ws) {
    logger.warn("Workspace not found for call transcription", {
      workspaceId,
      callId,
    });
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const validationResult = WorkspaceSchema.safeParse(ws);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Workspace validation failed: ${errorDetails}`);
  }

  const validatedWorkspace = validateWorkspace(validationResult.data);
  return validatedWorkspace || validationResult.data;
}
