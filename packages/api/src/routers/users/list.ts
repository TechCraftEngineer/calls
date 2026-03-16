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
        evaluationSettings?: { templateSlug?: string } | null;
      }) => {
        const u = r.user;
        const es = r.evaluationSettings as
          | { templateSlug?: "sales" | "support" | "general" }
          | null
          | undefined;
        return {
          id: u.id,
          memberId: r.id,
          userId: r.userId,
          role: r.role,
          email: u.email ?? "",
          name: u.name ?? "",
          givenName: u.givenName,
          familyName: u.familyName,
          internalExtensions: u.internalExtensions,
          mobilePhones: u.mobilePhones,
          created_at: (u.createdAt as Date)?.toISOString?.() ?? u.createdAt,
          telegramChatId: u.telegramChatId,
          evaluation_template_slug:
            es?.templateSlug &&
            ["sales", "support", "general"].includes(es.templateSlug)
              ? es.templateSlug
              : null,
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
