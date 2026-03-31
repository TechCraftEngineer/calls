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
        user: {
          id: string;
          email?: string | null;
          name?: string | null;
          givenName?: string | null;
          familyName?: string | null;
          internalExtensions?: string | null;
          mobilePhones?: string | null;
          createdAt?: Date | null;
          telegramChatId?: string | null;
        };
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
          givenName: u.givenName ?? null,
          familyName: u.familyName ?? null,
          internalExtensions: u.internalExtensions ?? null,
          mobilePhones: u.mobilePhones ?? null,
          createdAt:
            u.createdAt instanceof Date
              ? u.createdAt.toISOString()
              : ((u.createdAt as string | null) ?? null),
          telegramChatId: u.telegramChatId ?? null,
          evaluationTemplateSlug:
            es?.templateSlug && ["sales", "support", "general"].includes(es.templateSlug)
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
