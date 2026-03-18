import { pbxService } from "@calls/db";
import { syncPbxDirectory } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";

export const syncPbxDirectoryRoute = workspaceAdminProcedure.handler(
  async ({ context }) => {
    const config = await pbxService.getConfigWithSecrets(context.workspaceId);
    if (!config) {
      throw new ORPCError("NOT_FOUND", {
        message: "PBX интеграция не настроена",
      });
    }

    const result = await syncPbxDirectory(context.workspaceId, config);
    return { success: true, result };
  },
);
