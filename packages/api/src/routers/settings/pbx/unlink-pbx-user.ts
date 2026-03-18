import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
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
    if (!success) {
      throw new ORPCError("NOT_FOUND", { message: "PBX link not found" });
    }
    return { success };
  });
