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

      const hasFilterUpdates =
        d.filterExcludeAnsweringMachine !== undefined ||
        d.filterMinDuration !== undefined ||
        d.filterMinReplicas !== undefined;
      if (hasFilterUpdates) {
        await usersService.updateUserFilters(
          input.user_id,
          context.workspaceId!,
          d.filterExcludeAnsweringMachine ??
            (u.filterExcludeAnsweringMachine as boolean) ??
            false,
          d.filterMinDuration ?? (u.filterMinDuration as number) ?? 0,
          d.filterMinReplicas ?? (u.filterMinReplicas as number) ?? 0,
        );
      }

      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId!,
        {
          filterExcludeAnsweringMachine: d.filterExcludeAnsweringMachine,
          filterMinDuration: d.filterMinDuration,
          filterMinReplicas: d.filterMinReplicas,
          telegramDailyReport: d.telegramDailyReport,
          telegramManagerReport: d.telegramManagerReport,
          telegramWeeklyReport: d.telegramWeeklyReport,
          telegramMonthlyReport: d.telegramMonthlyReport,
          telegramSkipWeekends: d.telegramSkipWeekends,
          emailDailyReport: d.emailDailyReport,
          emailWeeklyReport: d.emailWeeklyReport,
          emailMonthlyReport: d.emailMonthlyReport,
          reportIncludeCallSummaries: d.reportIncludeCallSummaries,
          reportDetailed: d.reportDetailed,
          reportIncludeAvgValue: d.reportIncludeAvgValue,
          reportIncludeAvgRating: d.reportIncludeAvgRating,
          reportManagedUserIds: d.reportManagedUserIds,
          kpiBaseSalary: d.kpiBaseSalary,
          kpiTargetBonus: d.kpiTargetBonus,
          kpiTargetTalkTimeMinutes: d.kpiTargetTalkTimeMinutes,
          evaluationTemplateSlug: d.evaluationTemplateSlug,
          evaluationCustomInstructions: d.evaluationCustomInstructions,
        },
      );

      const hasTelegramUpdates =
        d.telegramDailyReport !== undefined ||
        d.telegramManagerReport !== undefined;
      if (hasTelegramUpdates) {
        await usersService.updateUserTelegramSettings(
          input.user_id,
          context.workspaceId!,
          d.telegramDailyReport ?? (u.telegramDailyReport as boolean) ?? false,
          d.telegramManagerReport ??
            (u.telegramManagerReport as boolean) ??
            false,
        );
      }

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
