import { promptsRepository } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";
import { PROMPT_KEYS } from "../constants";

export const getPrompts = workspaceProcedure.handler(async ({ context }) => {
  const allPrompts = await promptsRepository.findAll(context.workspaceId);
  const promptKeySet = new Set(PROMPT_KEYS);
  return allPrompts
    .filter((p) => promptKeySet.has(p.key as (typeof PROMPT_KEYS)[number]))
    .map((p) => ({
      key: p.key,
      value: p.value,
      description: p.description ?? undefined,
      updated_at: p.updatedAt?.toISOString(),
    }));
});
