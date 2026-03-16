import { evaluationTemplatesRepository } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";

export const getEvaluationTemplate = workspaceProcedure
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    const custom = await evaluationTemplatesRepository.findById(
      input.id,
      context.workspaceId,
    );
    if (custom) {
      return {
        id: custom.id,
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
