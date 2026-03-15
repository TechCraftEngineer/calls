/**
 * Resolves evaluation prompt from built-in or custom template.
 * Used by evaluate-call Inngest function.
 */

import { evaluationTemplatesRepository } from "@calls/db";
import { createLogger } from "../logger";
import { getEvaluationPrompt } from "./templates";

const logger = createLogger("resolve-evaluation-prompt");

/**
 * Returns the full system prompt for evaluation.
 * - Built-in (sales, support, general): uses templates from code
 * - Custom: fetches from evaluation_templates by workspace + slug
 */
export async function resolveEvaluationPrompt(
  workspaceId: string,
  templateSlug: string,
  customInstructions?: string | null,
): Promise<string> {
  if (evaluationTemplatesRepository.isBuiltinSlug(templateSlug)) {
    return getEvaluationPrompt(templateSlug, customInstructions);
  }

  const custom = await evaluationTemplatesRepository.findByWorkspaceAndSlug(
    workspaceId,
    templateSlug,
  );

  if (!custom) {
    logger.warn(
      `Custom template not found: workspaceId=${workspaceId}, templateSlug=${templateSlug}. Falling back to "general" template.`,
      { workspaceId, templateSlug },
    );
    return getEvaluationPrompt("general", customInstructions);
  }

  const base = custom.systemPrompt;
  if (!customInstructions?.trim()) return base;
  return `${base}\n\n## Дополнительные инструкции\n${customInstructions.trim()}`;
}
