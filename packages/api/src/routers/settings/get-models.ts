import { promptsRepository } from "@calls/db";
import { workspaceProcedure } from "../../orpc";
import { DEEPSEEK_MODELS } from "./constants";

export const getModels = workspaceProcedure.handler(async ({ context }) => {
  const current =
    (await promptsRepository.findByKeyWithDefault(
      "deepseek_model",
      context.workspaceId,
      "deepseek-chat",
    )) ?? "deepseek-chat";
  return { models: DEEPSEEK_MODELS, current_model: current };
});
