import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

const updateInvitationSettingsSchema = workspaceIdInputSchema.extend({
  invitationId: z.string().uuid("Некорректный ID приглашения"),
  settings: z.object({
    notificationSettings: z.any().optional(),
    reportSettings: z.any().optional(),
    kpiSettings: z.any().optional(),
    filterSettings: z.any().optional(),
    evaluationSettings: z.any().optional(),
  }),
});

export const updateInvitationSettings = workspaceAdminProcedure
  .input(updateInvitationSettingsSchema)
  .handler(async ({ input }) => {
    try {
      const result = await invitationsService.updateInvitationSettings(
        input.invitationId,
        input.workspaceId,
        input.settings,
      );
      return { success: result };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Ошибка обновления настроек приглашения";
      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
