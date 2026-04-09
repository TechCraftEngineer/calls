import { usersService } from "@calls/db";
import { userIdSchema } from "@calls/shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { canAccessUser, logUpdate } from "../utils";

const updateEvaluationSettingsSchema = z.object({
  evaluationTemplateSlug: z.union([
    z.literal("sales"),
    z.literal("support"),
    z.literal("general"),
    z.null(),
  ]),
  evaluationCustomInstructions: z.string().optional().nullable(),
});

const updateEvaluationSettingsOutputSchema = z.object({
  email: z.string(),
  givenName: z.string(),
  familyName: z.string(),
  role: z.string(),
  internalExtensions: z.string(),
  mobilePhones: z.string(),
  telegramChatId: z.string(),
  telegramDailyReport: z.boolean(),
  telegramManagerReport: z.boolean(),
  maxChatId: z.string(),
  maxDailyReport: z.boolean(),
  maxManagerReport: z.boolean(),
  filterExcludeAnsweringMachine: z.boolean(),
  filterMinDuration: z.number(),
  filterMinReplicas: z.number(),
  emailDailyReport: z.boolean(),
  emailWeeklyReport: z.boolean(),
  emailMonthlyReport: z.boolean(),
  telegramWeeklyReport: z.boolean(),
  telegramMonthlyReport: z.boolean(),
  telegramSkipWeekends: z.boolean(),
  reportManagedUserIds: z.array(z.string()),
  kpiBaseSalary: z.number(),
  kpiTargetBonus: z.number(),
  kpiTargetTalkTimeMinutes: z.number(),
  evaluationTemplateSlug: z.string().nullable(),
  evaluationCustomInstructions: z.string().nullable(),
});

export const updateEvaluationSettings = workspaceProcedure
  .input(z.object({ userId: userIdSchema, data: updateEvaluationSettingsSchema }))
  .output(updateEvaluationSettingsOutputSchema)
  .handler(async ({ input, context }) => {
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.userId, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const user = await usersService.getUser(input.userId);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      await usersService.updateUserReportKpiSettings(input.userId, context.workspaceId, {
        evaluationTemplateSlug: input.data.evaluationTemplateSlug,
        evaluationCustomInstructions: input.data.evaluationCustomInstructions,
      });

      await logUpdate(
        "evaluation settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        undefined,
        context.workspaceId,
      );

      const updatedUser = await usersService.getUserForEdit(input.userId, context.workspaceId);
      if (!updatedUser) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
      return updatedUser;
    } catch (error) {
      await logUpdate(
        "update user evaluation settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
