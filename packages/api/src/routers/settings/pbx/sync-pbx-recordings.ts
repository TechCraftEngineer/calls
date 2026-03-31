import { pbxService } from "@calls/db";
import { inngest, pbxSyncRequested } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";

export const syncPbxRecordingsRoute = workspaceAdminProcedure.handler(async ({ context }) => {
  if (!(await pbxService.getConfigWithSecrets(context.workspaceId))) {
    throw new ORPCError("NOT_FOUND", {
      message: "PBX интеграция не настроена",
    });
  }

  await inngest.send(
    pbxSyncRequested.create({
      workspaceId: context.workspaceId,
      syncType: "calls",
      syncRecordings: true,
    }),
  );

  return {
    success: true,
    message: "Синхронизация звонков с записями поставлена в очередь",
  };
});
