import { workspaceSettingsRepository } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";
import { REPORT_PROMPTS_SNAKE_TO_CAMEL, REPORT_SETTINGS_KEYS } from "../constants";

export const getPrompts = workspaceProcedure.handler(async ({ context }) => {
  const settings = await workspaceSettingsRepository.findByKeys(
    REPORT_SETTINGS_KEYS,
    context.workspaceId,
  );
  return settings.map((p) => ({
    key:
      REPORT_PROMPTS_SNAKE_TO_CAMEL[p.key as keyof typeof REPORT_PROMPTS_SNAKE_TO_CAMEL] ?? p.key,
    value: p.value,
    description: p.description ?? undefined,
    updatedAt: p.updatedAt?.toISOString(),
  }));
});
