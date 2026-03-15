import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../orpc";

export const list = workspaceAdminProcedure.handler(async ({ context }) => {
  const { workspaceId, workspacesService } = context;
  try {
    const rows = await workspacesService.getMembers(workspaceId);
    return rows.map(
      (r: {
        id: string;
        userId: string;
        role: string;
        createdAt: Date;
        user: Record<string, unknown>;
      }) => {
        const u = r.user;
        return {
          id: u.id,
          memberId: r.id,
          userId: r.userId,
          role: r.role,
          username: u.username ?? u.email,
          name: u.name ?? "",
          givenName: u.givenName,
          familyName: u.familyName,
          internalExtensions: u.internalExtensions,
          mobilePhones: u.mobilePhones,
          created_at: (u.createdAt as Date)?.toISOString?.() ?? u.createdAt,
          telegramChatId: u.telegramChatId,
        };
      },
    );
  } catch (error) {
    console.error("[Users] Error in list workspace members:", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Не удалось загрузить список пользователей",
    });
  }
});
