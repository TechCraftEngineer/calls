import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateTelegramSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateTelegramSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateTelegramSettingsSchema }))
  .handler(async ({ input, context }) => {
    const authUser = context.user;
    const userId =
      authUser &&
      typeof authUser === "object" &&
      typeof authUser.id === "string"
        ? authUser.id
        : undefined;
    const authEmail =
      authUser &&
      typeof authUser === "object" &&
      typeof authUser.email === "string"
        ? authUser.email
        : "unknown";
    if (!userId)
      throw new ORPCError("UNAUTHORIZED", {
        message: "Не удалось определить пользователя",
      });
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId,
        {
          telegramDailyReport: input.data.telegramDailyReport,
          telegramManagerReport: input.data.telegramManagerReport,
          telegramWeeklyReport: input.data.telegramWeeklyReport,
          telegramMonthlyReport: input.data.telegramMonthlyReport,
        },
      );

      await logUpdate(
        "telegram settings updated",
        user.email ?? "unknown",
        authEmail,
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user telegram settings",
        user.email ?? "unknown",
        authEmail,
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
