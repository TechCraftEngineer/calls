import { APP_CONFIG, env, paths } from "@calls/config";
import { invitationsService } from "@calls/db";
import { InvitationEmail, sendEmail } from "@calls/emails";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

const createInvitationSchema = workspaceIdInputSchema.extend({
  email: z.string().email("Некорректный email"),
  role: z.enum(["admin", "member"]).default("member"),
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
      await sendEmail({
        to: [input.email],
        subject: `Приглашение в ${workspace?.name ?? "рабочее пространство"} · ${APP_CONFIG.shortName}`,
        react: InvitationEmail({
          inviteLink,
          workspaceName: workspace?.name ?? "Рабочее пространство",
          inviterName: inviter?.name ?? undefined,
          role: input.role,
          userExists: result.userExists,
        }),
      });

      return {
        ...result,
        inviteUrl: inviteLink,
      };
    } catch (err) {
      const rawMsg =
        err instanceof Error ? err.message : "Ошибка создания приглашения";

      // Безопасные сообщения, которые можно показывать пользователю
      const safeMessages = [
        "Пользователь с таким email уже существует",
        "Недостаточно прав для создания приглашения",
        "Рабочее пространство не найдено",
        "Некорректный email адрес",
        "Ошибка создания приглашения",
      ];

      const isSafeMessage = safeMessages.some((safeMsg) =>
        rawMsg.toLowerCase().includes(safeMsg.toLowerCase()),
      );

      const msg = isSafeMessage
        ? rawMsg
        : "Не удалось отправить приглашение. Попробуйте позже.";

      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
