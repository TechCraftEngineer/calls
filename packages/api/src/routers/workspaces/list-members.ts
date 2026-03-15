import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

export const listMembers = protectedProcedure
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
        message: "Нет доступа к этому рабочему пространству",
      });
    }
    const rows = await context.workspacesService.getMembers(input.workspaceId);
    return rows.map(
      (r: {
        id: string;
        userId: string;
        role: string;
        createdAt: Date;
        user: {
          id: string;
          name: string | null;
          email: string;
          username: string | null;
        };
      }) => ({
        id: r.id,
        userId: r.userId,
        role: r.role,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
          username: r.user.username,
        },
      }),
    );
  });
