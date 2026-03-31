import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

export const setActive = protectedProcedure
  .input(workspaceIdInputSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Требуется авторизация через Better Auth",
      });
    }
    const role = await context.workspacesService.ensureUserInWorkspace(
      input.workspaceId,
      context.authUserId,
    );
    if (!role) {
      throw new ORPCError("FORBIDDEN", {
        message: "Вы не являетесь участником этого рабочего пространства",
      });
    }
    await context.workspacesService.setActiveWorkspace(context.authUserId, input.workspaceId);
    return { success: true, workspaceId: input.workspaceId };
  });
