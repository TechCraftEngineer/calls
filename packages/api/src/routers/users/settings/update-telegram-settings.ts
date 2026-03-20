import { settingsService, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { REPORT_PROMPTS_CAMEL_TO_SNAKE } from "../../settings/constants";
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
          telegramSkipWeekends: input.data.telegramSkipWeekends,
        },
      );

      if (input.data.telegramChatId !== undefined) {
        const trimmed = input.data.telegramChatId?.trim() ?? "";
        if (trimmed) {
          await usersService.saveTelegramChatId(input.user_id, trimmed);
        } else {
          await usersService.disconnectTelegram(input.user_id);
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

      const hasScheduleUpdates = scheduleKeys.some(
        (k) => input.data[k] !== undefined,
      );

      if (hasScheduleUpdates) {
        if (!canUpdateReportSchedule) {
          throw new ORPCError("FORBIDDEN", {
            message: "Недостаточно прав для изменения расписания отчётов",
          });
        }

        const username =
          authEmail?.trim() ||
          ((context.user as Record<string, unknown>).email as string) ||
          "system";

        // Workspace settings use snake_case keys.
        if (input.data.reportDailyTime !== undefined) {
          const value = input.data.reportDailyTime!;
          await settingsService.updateSetting(
            REPORT_PROMPTS_CAMEL_TO_SNAKE.reportDailyTime!,
            value,
            null,
            context.workspaceId,
            username,
          );
        }

        if (input.data.reportWeeklyDay !== undefined) {
          const value = input.data.reportWeeklyDay!;
          await settingsService.updateSetting(
            REPORT_PROMPTS_CAMEL_TO_SNAKE.reportWeeklyDay!,
            value,
            null,
            context.workspaceId,
            username,
          );
        }

        if (input.data.reportWeeklyTime !== undefined) {
          const value = input.data.reportWeeklyTime!;
          await settingsService.updateSetting(
            REPORT_PROMPTS_CAMEL_TO_SNAKE.reportWeeklyTime!,
            value,
            null,
            context.workspaceId,
            username,
          );
        }

        if (input.data.reportMonthlyDay !== undefined) {
          const value = input.data.reportMonthlyDay!;
          await settingsService.updateSetting(
            REPORT_PROMPTS_CAMEL_TO_SNAKE.reportMonthlyDay!,
            value,
            null,
            context.workspaceId,
            username,
          );
        }

        if (input.data.reportMonthlyTime !== undefined) {
          const value = input.data.reportMonthlyTime!;
          await settingsService.updateSetting(
            REPORT_PROMPTS_CAMEL_TO_SNAKE.reportMonthlyTime!,
            value,
            null,
            context.workspaceId,
            username,
          );
        }
      }

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
