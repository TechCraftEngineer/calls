import { workspaceSettingsRepository } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";
import { PROMPT_KEYS } from "../constants";

export const getPrompts = workspaceProcedure.handler(async ({ context }) => {
  const allSettings = await workspaceSettingsRepository.findAll(
    context.workspaceId,
  );
  const keySet = new Set(PROMPT_KEYS);
  return allSettings
    .filter((p) => keySet.has(p.key as (typeof PROMPT_KEYS)[number]))
    .map((p) => ({
      key: p.key,
      value: p.value,
      description: p.description ?? undefined,
      updated_at: p.updatedAt?.toISOString(),
    }));
});
