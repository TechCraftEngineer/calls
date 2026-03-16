import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../../orpc";
import { addMemberSchema } from "../schemas";

export const addMember = protectedProcedure
  .input(addMemberSchema)
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
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ORPCError("FORBIDDEN", {
        message: "Недостаточно прав для добавления участников",
      });
    }
    const existing = await context.workspacesService.getMemberWithRole(
      input.workspaceId,
      input.userId,
    );
    if (existing) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Пользователь уже является участником рабочего пространства",
      });
    }
    await context.workspacesService.addMember({
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
    });
    return { success: true };
  });
