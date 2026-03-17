import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { userUpdateSchema } from "./schemas";
import { canAccessUser, logUpdate } from "./utils";

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
        context.workspaceId!,
        d.filter_exclude_answering_machine ??
          (u.filter_exclude_answering_machine as boolean) ??
          false,
        d.filter_min_duration ?? (u.filter_min_duration as number) ?? 0,
        d.filter_min_replicas ?? (u.filter_min_replicas as number) ?? 0,
      );

      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId!,
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
          evaluationTemplateSlug: d.evaluation_template_slug,
          evaluationCustomInstructions: d.evaluation_custom_instructions,
        },
      );

      await usersService.updateUserTelegramSettings(
        input.user_id,
        context.workspaceId!,
        d.telegram_daily_report ??
          (u.telegram_daily_report as boolean) ??
          false,
        d.telegram_manager_report ??
          (u.telegram_manager_report as boolean) ??
          false,
      );

      await logUpdate(
        "updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        undefined,
        context.workspaceId,
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
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
