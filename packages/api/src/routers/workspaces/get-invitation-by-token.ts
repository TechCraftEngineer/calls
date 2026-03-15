import { invitationsService, workspacesService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../orpc";

export const getInvitationByToken = publicProcedure
  .input(z.object({ token: z.string().min(1) }))
  .handler(async ({ input }) => {
    const inv = await invitationsService.getByToken(input.token);
    if (!inv) {
      throw new ORPCError("NOT_FOUND", {
        message: "Приглашение не найдено или истекло",
      });
    }
    const workspace = await workspacesService.getById(inv.workspaceId);
    return {
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      workspaceId: inv.workspaceId,
      workspaceName: workspace?.name ?? "Рабочее пространство",
    };
  });
