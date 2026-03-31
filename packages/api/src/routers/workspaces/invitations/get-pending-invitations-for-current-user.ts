import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../../orpc";

export const getPendingInvitationsForCurrentUser = protectedProcedure.handler(
  async ({ context }) => {
    const userId = context.authUserId;
    const email = context.user?.email;

    if (!userId || !email || typeof email !== "string") {
      return { invitations: [] };
    }

    try {
      const invitations = await invitationsService.getPendingInvitationsForUser(userId, email);
      return { invitations };
    } catch (e) {
      console.error("Error fetching pending invitations for user:", {
        userId,
        email,
        error: e instanceof Error ? e.message : String(e),
      });
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: e instanceof Error ? e.message : "Ошибка при получении приглашений",
      });
    }
  },
);
