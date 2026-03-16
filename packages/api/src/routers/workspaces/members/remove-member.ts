import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../../orpc";
import { removeMemberSchema } from "../schemas";

export const removeMember = protectedProcedure
  .input(removeMemberSchema)
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
    const targetMember = await context.workspacesService.getMemberWithRole(
      input.workspaceId,
      input.userId,
    );
    const canRemove =
      member &&
      (member.role === "owner" ||
        (member.role === "admin" &&
          input.userId !== context.authUserId &&
          targetMember?.role !== "owner"));
    if (!canRemove) {
      throw new ORPCError("FORBIDDEN", {
        message: "Недостаточно прав для удаления участника",
      });
    }
    await context.workspacesService.removeMember(
      input.workspaceId,
      input.userId,
    );
    return { success: true };
  });
