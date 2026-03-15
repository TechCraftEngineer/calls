import { promptsRepository } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

export const getEvaluationSettings = workspaceProcedure.handler(
  async ({ context }) => {
    const defaultTemplate = await promptsRepository.findByKeyWithDefault(
      "evaluation_default_template",
      context.workspaceId,
      "general",
    );
    return {
      defaultTemplateSlug: defaultTemplate ?? "general",
    };
  },
);
