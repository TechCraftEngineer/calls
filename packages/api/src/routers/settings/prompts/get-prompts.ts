import { workspaceSettingsRepository } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";
import { REPORT_SETTINGS_KEYS } from "../constants";

export const getPrompts = workspaceProcedure.handler(async ({ context }) => {
  const settings = await workspaceSettingsRepository.findByKeys(
    REPORT_SETTINGS_KEYS,
    context.workspaceId,
  );
  return settings.map((p) => ({
    key: p.key,
    value: p.value,
    description: p.description ?? undefined,
    updated_at: p.updatedAt?.toISOString(),
  }));
});
