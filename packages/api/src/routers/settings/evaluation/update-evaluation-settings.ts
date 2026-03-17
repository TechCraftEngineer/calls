import { workspaceSettingsRepository } from "@calls/db";
import { ORPCError } from "@orpc/server";
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
      const ok = await workspaceSettingsRepository.upsert(
        "evaluation_default_template",
        input.defaultTemplateSlug,
        "Шаблон оценки звонков по умолчанию",
        context.workspaceId,
      );
      if (!ok) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось обновить настройки оценки",
        });
      }
    }
    return { success: true };
  });
