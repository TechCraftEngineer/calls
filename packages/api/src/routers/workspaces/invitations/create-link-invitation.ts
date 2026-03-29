import { APP_CONFIG, env, paths } from "@calls/config";
import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

const createLinkInvitationSchema = workspaceIdInputSchema.extend({
  role: z.enum(["admin", "member"]).default("member"),
});

export const createLinkInvitation = workspaceAdminProcedure
  .input(createLinkInvitationSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED");
    }
    try {
      const result = await invitationsService.createLinkInvitation(
        input.workspaceId,
        input.role,
        context.authUserId,
      );

      const inviteLink = `${env.APP_URL}${paths.invite.byToken(result.token)}`;

      return {
        ...result,
        inviteUrl: inviteLink,
      };
    } catch (err) {
      const rawMsg =
        err instanceof Error
          ? err.message
          : "Ошибка создания ссылки-приглашения";

      throw new ORPCError("BAD_REQUEST", { message: rawMsg });
    }
  });
