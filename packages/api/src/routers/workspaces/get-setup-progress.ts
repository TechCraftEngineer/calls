import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { getSetupProgressSchema } from "./schemas";

export const getSetupProgress = protectedProcedure
  .input(getSetupProgressSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = input;
    const userId = context.authUserId;

    const member = await context.workspacesService.getMemberWithRole(workspaceId, userId);
    if (!member) {
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к рабочему пространству",
      });
    }
    const completedSteps = await context.workspacesService.getSetupProgress(workspaceId);
    return { completedSteps };
  });
