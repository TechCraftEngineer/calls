import { evaluationTemplatesRepository } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const createSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(200, "Название слишком длинное"),
  description: z.string().max(500, "Описание слишком длинное").optional(),
  systemPrompt: z
    .string()
    .min(1, "Промпт обязателен")
    .max(10000, "Промпт слишком длинный")
    .refine((prompt) => {
      // Basic validation to ensure prompt contains required evaluation fields
      const lowerPrompt = prompt.toLowerCase();
      return (
        lowerPrompt.includes("value_score") &&
        lowerPrompt.includes("manager_score") &&
        (lowerPrompt.includes("value_explanation") ||
          lowerPrompt.includes("manager_feedback"))
      );
    }, "Промпт должен содержать обязательные поля: value_score, manager_score, value_explanation, manager_feedback"),
});

export const createEvaluationTemplate = workspaceAdminProcedure
  .input(createSchema)
  .handler(async ({ context, input }) => {
    const maxAttempts = 10;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const slug = evaluationTemplatesRepository.generateCustomSlug();

      try {
        const template = await evaluationTemplatesRepository.create(
          context.workspaceId,
          {
            slug,
            name: input.name,
            description: input.description ?? null,
            systemPrompt: input.systemPrompt,
          },
        );
        return {
          id: template.id,
          slug: template.slug,
          name: template.name,
          description: template.description ?? "",
          systemPrompt: template.systemPrompt,
          isBuiltin: false,
        };
      } catch (error) {
        // Check if it's a unique constraint violation
        if (
          error instanceof Error &&
          error.message.includes("unique constraint")
        ) {
          attempt++;
          continue;
        }
        throw error;
      }
    }

    throw new Error("Failed to generate unique slug after multiple attempts");
  });
