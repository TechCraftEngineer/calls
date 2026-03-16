import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../../orpc";
import { updateMemberRoleSchema } from "../schemas";

export const updateMemberRole = protectedProcedure
  .input(updateMemberRoleSchema)
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
        message: "Изменять роли участников может только владелец",
      });
    }
    await context.workspacesService.updateMemberRole(
      input.workspaceId,
      input.userId,
      input.role,
    );
    return { success: true };
  });
