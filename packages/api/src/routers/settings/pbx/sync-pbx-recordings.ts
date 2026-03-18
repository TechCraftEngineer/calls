import { pbxService } from "@calls/db";
import { syncPbxCalls } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";

export const syncPbxRecordingsRoute = workspaceAdminProcedure.handler(
  async ({ context }) => {
    const config = await pbxService.getConfigWithSecrets(context.workspaceId);
    if (!config) {
      throw new ORPCError("NOT_FOUND", {
        message: "PBX интеграция не настроена",
      });
    }

    const result = await syncPbxCalls(context.workspaceId, {
      ...config,
      syncRecordings: true,
    });
    return { success: true, result };
  },
);
