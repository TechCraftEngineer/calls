import { settingsService, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { userIdSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { REPORT_PROMPTS_CAMEL_TO_SNAKE } from "../../settings/constants";
import { updateTelegramSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateTelegramSettings = workspaceProcedure
  .input(z.object({ userId: userIdSchema, data: updateTelegramSettingsSchema }))
  .handler(async ({ input, context }) => {
    const authUser = context.user;
    const userId =
      authUser && typeof authUser === "object" && typeof authUser.id === "string"
        ? authUser.id
        : undefined;
    const authEmail =
      authUser && typeof authUser === "object" && typeof authUser.email === "string"
        ? authUser.email
        : "";
    const actorUsername = authEmail.trim() || context.sessionEmail?.trim() || "system";
    if (!userId)
      throw new ORPCError("UNAUTHORIZED", {
        message: "Не удалось определить пользователя",
      });
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
      await usersService.updateUserReportKpiSettings(input.userId, context.workspaceId, {
        telegramDailyReport: input.data.telegramDailyReport,
        telegramManagerReport: input.data.telegramManagerReport,
        telegramWeeklyReport: input.data.telegramWeeklyReport,
        telegramMonthlyReport: input.data.telegramMonthlyReport,
        telegramSkipWeekends: input.data.telegramSkipWeekends,
      });

      if (input.data.telegramChatId !== undefined) {
        const trimmed = input.data.telegramChatId?.trim() ?? "";
        if (trimmed) {
          await usersService.saveTelegramChatId(input.userId, trimmed);
        } else {
          await usersService.disconnectTelegram(input.userId);
        }
      }

      const canUpdateReportSchedule =
        context.workspaceRole === "admin" || context.workspaceRole === "owner";

      const scheduleKeys = [
        "reportDailyTime",
        "reportWeeklyDay",
        "reportWeeklyTime",
        "reportMonthlyDay",
        "reportMonthlyTime",
      ] as const;

      const hasScheduleUpdates = scheduleKeys.some((k) => input.data[k] !== undefined);

      if (hasScheduleUpdates) {
        if (!canUpdateReportSchedule) {
          throw new ORPCError("FORBIDDEN", {
            message: "Недостаточно прав для изменения расписания отчётов",
          });
        }

        const username = actorUsername;
        const reportDailyTimeKey = REPORT_PROMPTS_CAMEL_TO_SNAKE.reportDailyTime;
        const reportWeeklyDayKey = REPORT_PROMPTS_CAMEL_TO_SNAKE.reportWeeklyDay;
        const reportWeeklyTimeKey = REPORT_PROMPTS_CAMEL_TO_SNAKE.reportWeeklyTime;
        const reportMonthlyDayKey = REPORT_PROMPTS_CAMEL_TO_SNAKE.reportMonthlyDay;
        const reportMonthlyTimeKey = REPORT_PROMPTS_CAMEL_TO_SNAKE.reportMonthlyTime;

        // Workspace settings use snake_case keys.
        const scheduleUpdates = [
          {
            key: reportDailyTimeKey || "report_daily_time",
            value: input.data.reportDailyTime,
          },
          {
            key: reportWeeklyDayKey || "report_weekly_day",
            value: input.data.reportWeeklyDay,
          },
          {
            key: reportWeeklyTimeKey || "report_weekly_time",
            value: input.data.reportWeeklyTime,
          },
          {
            key: reportMonthlyDayKey || "report_monthly_day",
            value: input.data.reportMonthlyDay,
          },
          {
            key: reportMonthlyTimeKey || "report_monthly_time",
            value: input.data.reportMonthlyTime,
          },
        ];
        for (const { key, value } of scheduleUpdates) {
          if (value !== undefined) {
            await settingsService.updateSetting(key, value, null, context.workspaceId, username);
          }
        }
      }

      await logUpdate(
        "telegram settings updated",
        user.email ?? "unknown",
        actorUsername,
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.userId);
    } catch (error) {
      await logUpdate(
        "update user telegram settings",
        user.email ?? "unknown",
        actorUsername,
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
