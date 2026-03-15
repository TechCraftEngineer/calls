import { evaluationTemplatesRepository } from "@calls/db";
import { EVALUATION_TEMPLATES, type EvaluationTemplateSlug } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

export const getEvaluationTemplateBySlug = workspaceProcedure
  .input(z.object({ slug: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    if (evaluationTemplatesRepository.isBuiltinSlug(input.slug)) {
      const builtin =
        EVALUATION_TEMPLATES[input.slug as EvaluationTemplateSlug];
      return {
        slug: builtin.slug,
        name: builtin.name,
        description: builtin.description,
        systemPrompt: builtin.systemPrompt,
        isBuiltin: true,
      };
    }
    const custom = await evaluationTemplatesRepository.findByWorkspaceAndSlug(
      context.workspaceId,
      input.slug,
    );
    if (custom) {
      return {
        slug: custom.slug,
        name: custom.name,
        description: custom.description ?? "",
        systemPrompt: custom.systemPrompt,
        isBuiltin: false,
      };
    }
    throw new ORPCError("NOT_FOUND", {
      message: "Шаблон не найден",
    });
  });
