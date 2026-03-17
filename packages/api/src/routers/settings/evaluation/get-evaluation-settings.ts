import { workspaceSettingsRepository } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";

export const getEvaluationSettings = workspaceProcedure.handler(
  async ({ context }) => {
    const defaultTemplate =
      await workspaceSettingsRepository.findByKeyWithDefault(
        "evaluation_default_template",
        context.workspaceId,
        "general",
      );
    return {
      defaultTemplateSlug: defaultTemplate ?? "general",
    };
  },
);
