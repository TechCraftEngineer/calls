import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { updateWorkspaceSchema } from "./schemas";

export const update = protectedProcedure
  .input(updateWorkspaceSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Требуется авторизация через Better Auth",
      });
    }
    const { workspaceId, ...data } = input;
    const member = await context.workspacesService.getMemberWithRole(
      workspaceId,
      context.authUserId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ORPCError("FORBIDDEN", {
        message: "Недостаточно прав для изменения рабочего пространства",
      });
    }
    await context.workspacesService.update(workspaceId, data);
    return context.workspacesService.getById(workspaceId);
  });
