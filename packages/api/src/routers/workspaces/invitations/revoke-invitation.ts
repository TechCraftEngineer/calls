import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

const revokeSchema = workspaceIdInputSchema.extend({
  invitationId: z.string().uuid(),
});

export const revokeInvitation = workspaceAdminProcedure
  .input(revokeSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED");
    }
    const ok = await invitationsService.revoke(
      input.invitationId,
      input.workspaceId,
      context.authUserId,
    );
    if (!ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "Приглашение не найдено",
      });
    }
    return { success: true };
  });
