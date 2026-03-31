import { createLogger } from "@calls/api";
import { invitationsService, workspacesService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../../orpc";

const logger = createLogger("get-invitation-by-token");

export const getInvitationByToken = publicProcedure
  .input(z.object({ token: z.string().min(1) }))
  .handler(async ({ input }) => {
    try {
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
        userExists: inv.userExists,
        invitationType: inv.invitationType,
      };
    } catch (e) {
      if (e instanceof ORPCError) throw e;
      logger.error("getInvitationByToken failed", {
        token: `${input.token.slice(0, 8)}...`,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: e instanceof Error ? e.message : "Ошибка при получении приглашения",
      });
    }
  });
