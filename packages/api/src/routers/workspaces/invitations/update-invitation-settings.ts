import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

const partialNotificationSettingsSchema = z.object({}).passthrough().optional();
const partialReportSettingsSchema = z.object({}).passthrough().optional();
const partialKpiSettingsSchema = z.object({}).passthrough().optional();
const partialFilterSettingsSchema = z.object({}).passthrough().optional();
const partialEvaluationSettingsSchema = z.object({}).passthrough().optional();

const updateInvitationSettingsSchema = workspaceIdInputSchema.extend({
  invitationId: z.string().uuid("Некорректный ID приглашения"),
  settings: z.object({
    notificationSettings: partialNotificationSettingsSchema,
    reportSettings: partialReportSettingsSchema,
    kpiSettings: partialKpiSettingsSchema,
    filterSettings: partialFilterSettingsSchema,
    evaluationSettings: partialEvaluationSettingsSchema,
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
