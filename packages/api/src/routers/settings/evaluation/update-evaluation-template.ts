import { evaluationTemplatesRepository } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200, "Название слишком длинное").optional(),
  description: z.string().max(500, "Описание слишком длинное").optional().nullable(),
  systemPrompt: z
    .string()
    .min(1)
    .max(10000, "Промпт слишком длинный")
    .refine((prompt) => {
      // Basic validation to ensure prompt contains required evaluation fields
      const lowerPrompt = prompt.toLowerCase();
      return (
        lowerPrompt.includes("value_score") &&
        lowerPrompt.includes("manager_score") &&
        (lowerPrompt.includes("value_explanation") || lowerPrompt.includes("manager_feedback"))
      );
    }, "Промпт должен содержать обязательные поля: value_score, manager_score, value_explanation, manager_feedback")
    .optional(),
});

export const updateEvaluationTemplate = workspaceAdminProcedure
  .input(updateSchema)
  .handler(async ({ context, input }) => {
    const { id, ...data } = input;
    const ok = await evaluationTemplatesRepository.update(id, context.workspaceId, data);
    if (!ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "Шаблон не найден",
      });
    }
    const updated = await evaluationTemplatesRepository.findById(id, context.workspaceId);
    if (!updated) throw new ORPCError("NOT_FOUND", { message: "Шаблон не найден" });
    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description ?? "",
      systemPrompt: updated.systemPrompt,
      isBuiltin: false,
    };
  });
