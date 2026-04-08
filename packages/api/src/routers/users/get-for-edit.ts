import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { userIdSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { canAccessUser } from "./utils";

const getForEditOutputSchema = z.object({
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

export const getForEdit = workspaceProcedure
  .input(z.object({ user_id: userIdSchema }))
  .output(getForEditOutputSchema)
  .handler(async ({ input, context }) => {
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const data = await usersService.getUserForEdit(input.user_id, context.workspaceId);
    if (!data) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    return data;
  });
