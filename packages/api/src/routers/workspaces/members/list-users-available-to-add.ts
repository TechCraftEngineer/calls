import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

export const listUsersAvailableToAdd = protectedProcedure
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
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ORPCError("FORBIDDEN", {
        message: "Недостаточно прав для добавления участников",
      });
    }
    const rows = await context.workspacesService.getUsersNotInWorkspace(
      input.workspaceId,
    );
    return rows.map(
      (r: { id: string; name: string | null; email: string }) => ({
        id: r.id,
        name: r.name ?? "Без имени",
        email: r.email ?? `user_${r.id.slice(0, 8)}`,
      }),
    );
  });
