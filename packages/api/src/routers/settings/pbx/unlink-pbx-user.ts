import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxUnlinkSchema } from "./schemas";

export const unlinkPbxUser = workspaceAdminProcedure
  .input(pbxUnlinkSchema)
  .handler(async ({ input, context }) => {
    const success = await pbxService.unlinkTarget(
      context.workspaceId,
      input.targetType,
      input.targetExternalId,
    );
    return { success };
  });
