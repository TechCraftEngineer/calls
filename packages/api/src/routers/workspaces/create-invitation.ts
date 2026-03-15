import { invitationsService } from "@calls/db";
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
      if (!result) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось создать приглашение",
        });
      }
      return result;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Ошибка создания приглашения";
      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
