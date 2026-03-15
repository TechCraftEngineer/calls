import { systemRepository, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import {
  updateBasicInfoSchema,
  updateEmailSettingsSchema,
  updateFilterSettingsSchema,
  updateKpiSettingsSchema,
  updateMaxSettingsSchema,
  updateReportSettingsSchema,
  updateTelegramSettingsSchema,
  userUpdateSchema,
} from "../schemas";
import { canAccessUser } from "../utils";

async function logUpdate(
  action: string,
  username: string,
  contextUsername: string,
  error?: unknown,
) {
  await systemRepository.addActivityLog(
    error ? "error" : "info",
    error
      ? `Failed to ${action} ${username}: ${error instanceof Error ? error.message : String(error)}`
      : `User ${action}: ${username}`,
    contextUsername,
  );
}

export const update = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: userUpdateSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    const d = input.data;
    const u = user as Record<string, unknown>;

    try {
      const givenName = (d.givenName ?? u.givenName ?? "").toString().trim();
      const familyName = (d.familyName ?? u.familyName ?? "").toString().trim();
      if (!givenName) throw new Error("Given name is required");

      await usersService.updateUserName(input.user_id, {
        givenName,
        familyName,
      });

      if (d.internalExtensions !== undefined) {
        await usersService.updateUserInternalExtensions(
          input.user_id,
          d.internalExtensions,
        );
      }

      if (d.mobilePhones !== undefined) {
        await usersService.updateUserMobilePhones(
          input.user_id,
          d.mobilePhones,
        );
      }

      if (d.email !== undefined) {
        await usersService.updateUserEmail(input.user_id, d.email);
      }

      await usersService.updateUserFilters(
        input.user_id,
        context.workspaceId,
        d.filter_exclude_answering_machine ??
          (u.filter_exclude_answering_machine as boolean) ??
          false,
        d.filter_min_duration ?? (u.filter_min_duration as number) ?? 0,
        d.filter_min_replicas ?? (u.filter_min_replicas as number) ?? 0,
      );

      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId,
        {
          filterExcludeAnsweringMachine: d.filter_exclude_answering_machine,
          filterMinDuration: d.filter_min_duration,
          filterMinReplicas: d.filter_min_replicas,
          telegramDailyReport: d.telegram_daily_report,
          telegramManagerReport: d.telegram_manager_report,
          telegramWeeklyReport: d.telegram_weekly_report,
          telegramMonthlyReport: d.telegram_monthly_report,
          telegramSkipWeekends: d.telegram_skip_weekends,
          emailDailyReport: d.email_daily_report,
          emailWeeklyReport: d.email_weekly_report,
          emailMonthlyReport: d.email_monthly_report,
          reportIncludeCallSummaries: d.report_include_call_summaries,
          reportDetailed: d.report_detailed,
          reportIncludeAvgValue: d.report_include_avg_value,
          reportIncludeAvgRating: d.report_include_avg_rating,
          reportManagedUserIds: d.report_managed_user_ids,
          kpiBaseSalary: d.kpi_base_salary,
          kpiTargetBonus: d.kpi_target_bonus,
          kpiTargetTalkTimeMinutes: d.kpi_target_talk_time_minutes,
        },
      );

      await usersService.updateUserTelegramSettings(
        input.user_id,
        context.workspaceId,
        d.telegram_daily_report ??
          (u.telegram_daily_report as boolean) ??
          false,
        d.telegram_manager_report ??
          (u.telegram_manager_report as boolean) ??
          false,
      );

      await logUpdate(
        "updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      const updated = await usersService.getUser(input.user_id);
      if (!updated)
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось получить обновлённые данные",
        });

      return updated;
    } catch (error) {
      await logUpdate(
        "update",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

export const updateBasicInfo = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateBasicInfoSchema }))
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
      await usersService.updateUserName(input.user_id, {
        givenName: input.data.givenName.trim(),
        familyName: input.data.familyName?.trim() || "",
      });

      if (input.data.internalExtensions !== undefined) {
        await usersService.updateUserInternalExtensions(
          input.user_id,
          input.data.internalExtensions.trim() || null,
        );
      }

      if (input.data.mobilePhones !== undefined) {
        await usersService.updateUserMobilePhones(
          input.user_id,
          input.data.mobilePhones.trim() || null,
        );
      }

      await logUpdate(
        "basic info updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user basic info",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

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
        context.workspaceId,
        {
          emailDailyReport: input.data.email_daily_report,
          emailWeeklyReport: input.data.email_weekly_report,
          emailMonthlyReport: input.data.email_monthly_report,
        },
      );

      await logUpdate(
        "email settings updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user email settings",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

export const updateTelegramSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateTelegramSettingsSchema }))
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
      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId,
        {
          telegramDailyReport: input.data.telegram_daily_report,
          telegramManagerReport: input.data.telegram_manager_report,
          telegramWeeklyReport: input.data.telegram_weekly_report,
          telegramMonthlyReport: input.data.telegram_monthly_report,
        },
      );

      await logUpdate(
        "telegram settings updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user telegram settings",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

export const updateMaxSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateMaxSettingsSchema }))
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
      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId,
        {
          maxDailyReport: input.data.max_daily_report,
          maxManagerReport: input.data.max_manager_report,
        },
      );

      await logUpdate(
        "max settings updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user max settings",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

export const updateReportSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateReportSettingsSchema }))
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
      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId,
        {
          reportIncludeCallSummaries: input.data.report_include_call_summaries,
          reportDetailed: input.data.report_detailed,
          reportIncludeAvgValue: input.data.report_include_avg_value,
          reportIncludeAvgRating: input.data.report_include_avg_rating,
        },
      );

      await logUpdate(
        "report settings updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user report settings",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

export const updateKpiSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateKpiSettingsSchema }))
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
      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId,
        {
          kpiBaseSalary: input.data.kpi_base_salary,
          kpiTargetBonus: input.data.kpi_target_bonus,
          kpiTargetTalkTimeMinutes: input.data.kpi_target_talk_time_minutes,
        },
      );

      await logUpdate(
        "KPI settings updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user KPI settings",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });

export const updateFilterSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateFilterSettingsSchema }))
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
      await usersService.updateUserFilters(
        input.user_id,
        context.workspaceId,
        input.data.filter_exclude_answering_machine ?? false,
        input.data.filter_min_duration ?? 0,
        input.data.filter_min_replicas ?? 0,
      );

      await logUpdate(
        "filter settings updated",
        user.username,
        (context.user as Record<string, unknown>).username as string,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user filter settings",
        user.username,
        (context.user as Record<string, unknown>).username as string,
        error,
      );
      throw error;
    }
  });
