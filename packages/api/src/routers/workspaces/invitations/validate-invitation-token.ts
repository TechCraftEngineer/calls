import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../../orpc";

const validateInvitationTokenSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
});

export const validateInvitationToken = publicProcedure
  .input(validateInvitationTokenSchema)
  .handler(async ({ input }) => {
    try {
      const invitation = await invitationsService.getByToken(input.token);
      
      if (!invitation) {
        return { valid: false, reason: "Приглашение не найдено" };
      }

      const now = new Date();

      if (invitation.expiresAt < now) {
        return { valid: false, reason: "Срок действия приглашения истёк" };
      }

      return { 
        valid: true, 
        invitation: {
          email: invitation.email,
          workspaceName: invitation.workspaceName,
        }
      };
    } catch (e) {
      console.error("Error validating invitation token:", e);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Ошибка при валидации токена приглашения",
      });
    }
  });
