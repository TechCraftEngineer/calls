/**
 * Accept invitation for existing (logged-in) user.
 * Protected procedure - requires auth.
 */

import { createLogger } from "@calls/api";
import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../orpc";

const logger = createLogger("accept-invitation-for-existing-user");

export const acceptInvitationForExistingUser = protectedProcedure
  .input(z.object({ token: z.string().min(1, "Токен приглашения обязателен") }))
  .handler(async ({ input, context }) => {
    const authUserId =
      context.authUserId ?? (context.user as { id?: string })?.id;
    if (!authUserId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Необходима авторизация",
      });
    }

    try {
      const result = await invitationsService.acceptInvitationForExistingUser(
        input.token,
        authUserId,
      );
      return {
        success: true,
        workspaceId: result.workspaceId,
        workspaceName: result.workspaceName,
      };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Не удалось принять приглашение";
      logger.error("acceptInvitationForExistingUser failed", {
        token: input.token.slice(0, 8) + "...",
        error: msg,
      });
      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
