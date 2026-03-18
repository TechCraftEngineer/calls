import { pbxService } from "@calls/db";
import { workspaceProcedure } from "../../../orpc";

export const getPbx = workspaceProcedure.handler(async ({ context }) => {
  const [settings, syncStates] = await Promise.all([
    pbxService.getSettings(context.workspaceId),
    pbxService.listSyncStates(context.workspaceId),
  ]);

  return {
    ...settings,
    syncStates,
  };
});
