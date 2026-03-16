import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateEmailSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateEmailSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateEmailSettingsSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      if (input.data.email !== undefined) {
        await usersService.updateUserEmail(
          input.user_id,
          input.data.email?.trim() || null,
        );
      }

      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId!,
        {
          emailDailyReport: input.data.email_daily_report,
          emailWeeklyReport: input.data.email_weekly_report,
          emailMonthlyReport: input.data.email_monthly_report,
        },
      );

      await logUpdate(
        "email settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user email settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
      );
      throw error;
    }
  });
