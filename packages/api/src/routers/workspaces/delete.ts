import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

export const deleteWorkspace = protectedProcedure
  .input(workspaceIdInputSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Требуется авторизация через Better Auth",
      });
    }
    const member = await context.workspacesService.getMemberWithRole(
      input.workspaceId,
      context.authUserId,
    );
    if (!member || member.role !== "owner") {
      throw new ORPCError("FORBIDDEN", {
        message: "Удалить рабочее пространство может только владелец",
      });
    }
    await context.workspacesService.delete(input.workspaceId);
    return { success: true };
  });
