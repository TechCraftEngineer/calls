import {
  evaluationTemplatesRepository,
  userWorkspaceSettingsRepository,
} from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

export const deleteEvaluationTemplate = workspaceAdminProcedure
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    // First, get the template to find its slug
    const template = await evaluationTemplatesRepository.findById(
      input.id,
      context.workspaceId,
    );

    if (!template) {
      throw new ORPCError("NOT_FOUND", {
        message: "Шаблон не найден",
      });
    }

    // Update all users who use this template to fallback to "general"
    const updatedUsersCount =
      await userWorkspaceSettingsRepository.updateEvaluationTemplateForWorkspace(
        context.workspaceId,
        template.slug,
        "general",
      );

    // Now delete the template
    const ok = await evaluationTemplatesRepository.delete(
      input.id,
      context.workspaceId,
    );

    if (!ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "Шаблон не найден",
      });
    }

    return {
      success: true,
      updatedUsersCount,
    };
  });
