import { evaluationTemplatesRepository } from "@calls/db";
import { getEvaluationTemplatesList as getBuiltinTemplates } from "@calls/jobs";
import { workspaceProcedure } from "../../orpc";

export const getEvaluationTemplates = workspaceProcedure.handler(
  async ({ context }) => {
    const builtin = getBuiltinTemplates();
    const custom = await evaluationTemplatesRepository.listByWorkspace(
      context.workspaceId,
    );
    return [
      ...builtin.map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        isBuiltin: true as const,
        id: null as string | null,
      })),
      ...custom.map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description ?? "",
        isBuiltin: false as const,
        id: t.id,
      })),
    ];
  },
);
