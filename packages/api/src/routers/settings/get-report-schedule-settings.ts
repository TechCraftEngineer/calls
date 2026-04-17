import { getReportScheduleSettings, workspaceSettingsRepository } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

export const getReportScheduleSettingsHandler = workspaceProcedure.handler(async ({ context }) => {
  return getReportScheduleSettings(workspaceSettingsRepository, context.workspaceId);
});
