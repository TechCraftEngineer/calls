import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";

export const list = protectedProcedure.handler(async ({ context }) => {
  // authUserId из Better Auth session; fallback на user.id если сессия не передала id
  const authUserId = context.authUserId ?? (context.user as { id?: string } | null)?.id;
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
      workspace: {
        id: string;
        name: string;
        nameEn: string | null;
        description: string | null;
        isOnboarded: boolean;
      };
      role: string;
      createdAt: Date;
    }) => ({
      id: r.workspace.id,
      name: r.workspace.name,
      nameEn: r.workspace.nameEn,
      description: r.workspace.description,
      isOnboarded: r.workspace.isOnboarded,
      role: r.role,
      memberSince: r.createdAt,
    }),
  );
  return { workspaces, activeWorkspaceId };
});
