import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";

export const list = protectedProcedure.handler(async ({ context }) => {
  const authUserId = context.authUserId;
  if (!authUserId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Требуется авторизация через Better Auth",
    });
  }
  const [rows, activeWorkspaceId] = await Promise.all([
    context.workspacesService.getUserWorkspaces(authUserId),
    context.workspacesService.getActiveWorkspaceId(authUserId),
  ]);
  const workspaces = rows.map(
    (r: {
      workspace: Record<string, unknown>;
      role: string;
      createdAt: Date;
    }) => ({
      ...(r.workspace as object),
      role: r.role,
      memberSince: r.createdAt,
    }),
  );
  return { workspaces, activeWorkspaceId };
});
