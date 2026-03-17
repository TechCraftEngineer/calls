import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

const partialNotificationSettingsSchema = z
  .object({
    email: z
      .object({
        dailyReport: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        monthlyReport: z.boolean().optional(),
      })
      .optional(),
    telegram: z
      .object({
        dailyReport: z.boolean().optional(),
        managerReport: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        monthlyReport: z.boolean().optional(),
        skipWeekends: z.boolean().optional(),
        connectToken: z.string().optional(),
      })
      .optional(),
    max: z
      .object({
        chatId: z.string().optional(),
        dailyReport: z.boolean().optional(),
        managerReport: z.boolean().optional(),
        connectToken: z.string().optional(),
      })
      .optional(),
  })
  .partial()
  .optional();

const partialReportSettingsSchema = z
  .object({
    includeCallSummaries: z.boolean().optional(),
    detailed: z.boolean().optional(),
    includeAvgValue: z.boolean().optional(),
    includeAvgRating: z.boolean().optional(),
    managedUserIds: z.array(z.string().min(1)).optional(),
  })
  .partial()
  .optional();

const partialKpiSettingsSchema = z
  .object({
    baseSalary: z.number().optional(),
    targetBonus: z.number().optional(),
    targetTalkTimeMinutes: z.number().optional(),
  })
  .partial()
  .optional();

const partialFilterSettingsSchema = z
  .object({
    excludeAnsweringMachine: z.boolean().optional(),
    minDuration: z.number().optional(),
    minReplicas: z.number().optional(),
  })
  .partial()
  .optional();

const partialEvaluationSettingsSchema = z
  .object({
    templateSlug: z.string().min(1).optional(),
    customInstructions: z.string().optional(),
  })
  .partial()
  .optional();

const updateInvitationSettingsSchema = workspaceIdInputSchema.extend({
  invitationId: z.string().uuid("Некорректный ID приглашения"),
  settings: z
    .object({
      notificationSettings: partialNotificationSettingsSchema,
      reportSettings: partialReportSettingsSchema,
      kpiSettings: partialKpiSettingsSchema,
      filterSettings: partialFilterSettingsSchema,
      evaluationSettings: partialEvaluationSettingsSchema,
    })
    .refine(
      (s) =>
        s.notificationSettings !== undefined ||
        s.reportSettings !== undefined ||
        s.kpiSettings !== undefined ||
        s.filterSettings !== undefined ||
        s.evaluationSettings !== undefined,
      { message: "Требуется хотя бы один блок настроек" },
    ),
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
