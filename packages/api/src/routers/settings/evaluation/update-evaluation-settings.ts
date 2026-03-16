import { promptsRepository } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { evaluationTemplateSlugSchema } from "../schemas";

const updateEvaluationSettingsSchema = z.object({
  defaultTemplateSlug: evaluationTemplateSlugSchema.optional(),
});

export const updateEvaluationSettings = workspaceAdminProcedure
  .input(updateEvaluationSettingsSchema)
  .handler(async ({ input, context }) => {
    if (input.defaultTemplateSlug !== undefined) {
      await promptsRepository.upsert(
        "evaluation_default_template",
        input.defaultTemplateSlug,
        "Шаблон оценки звонков по умолчанию",
        context.workspaceId,
      );
    }
    return { success: true };
  });
