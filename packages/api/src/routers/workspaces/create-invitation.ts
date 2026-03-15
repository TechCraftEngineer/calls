import { APP_CONFIG, env, paths } from "@calls/config";
import { invitationsService } from "@calls/db";
import { InvitationEmail, sendEmail } from "@calls/emails";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

const createInvitationSchema = workspaceIdInputSchema.extend({
  email: z.string().email("Некорректный email"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export const createInvitation = workspaceAdminProcedure
  .input(createInvitationSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED");
    }
    try {
      const result = await invitationsService.createInvitation(
        input.workspaceId,
        input.email,
        input.role,
        context.authUserId,
      );

      const workspace = await invitationsService.workspacesService.getById(
        input.workspaceId,
      );
      const inviter = await invitationsService.usersService.getUser(
        context.authUserId,
      );

      const inviteLink = `${env.APP_URL}${paths.invite.byToken(result.token)}`;
      const emailRole = input.role === "owner" ? "admin" : input.role;
      await sendEmail({
        to: [input.email],
        subject: `Приглашение в ${workspace?.name ?? "workspace"} · ${APP_CONFIG.shortName}`,
        react: InvitationEmail({
          inviteLink,
          workspaceName: workspace?.name ?? "Workspace",
          inviterName: inviter?.name ?? undefined,
          role: emailRole,
        }),
      });

      return result;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Ошибка создания приглашения";
      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
