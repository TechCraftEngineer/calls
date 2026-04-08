import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { userIdSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateEmailSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateEmailSettings = workspaceProcedure
  .input(z.object({ userId: userIdSchema, data: updateEmailSettingsSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.userId, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const user = await usersService.getUser(input.userId);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      if (input.data.email !== undefined) {
        await usersService.updateUserEmail(input.userId, input.data.email?.trim() || null);
      }

      await usersService.updateUserReportKpiSettings(input.userId, context.workspaceId, {
        emailDailyReport: input.data.emailDailyReport,
        emailWeeklyReport: input.data.emailWeeklyReport,
        emailMonthlyReport: input.data.emailMonthlyReport,
      });

      await logUpdate(
        "email settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.userId);
    } catch (error) {
      await logUpdate(
        "update user email settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
