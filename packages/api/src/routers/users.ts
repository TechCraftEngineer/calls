import { randomBytes } from "node:crypto";
import { promptsService, systemRepository, usersService } from "@calls/db";
import { getBotUsername } from "@calls/telegram-bot";
import { z } from "zod";
import type { WorkspaceRole } from "../orpc";
import {
  adminProcedure,
  protectedProcedure,
  workspaceAdminProcedure,
  workspaceProcedure,
} from "../orpc";
import { isAdminUser } from "../user-profile";

async function canAccessUser(
  currentUserId: string,
  targetUserId: string,
  workspaceRole: WorkspaceRole | null,
): Promise<boolean> {
  if (currentUserId === targetUserId) return true;

  // Check workspace role first (fast path)
  if (workspaceRole === "admin" || workspaceRole === "owner") {
    return true;
  }

  // Fallback to database check for additional security
  try {
    const user = await usersService.getUser(currentUserId);
    if (!user) return false;
    return isAdminUser(user as Record<string, unknown>);
  } catch {
    return false;
  }
}

const userCreateSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  givenName: z.string().min(1),
  familyName: z.string().optional().default(""),
  internalExtensions: z.string().optional().nullable(),
  mobilePhones: z.string().optional().nullable(),
});

const userUpdateSchema = z.object({
  givenName: z.string().optional(),
  familyName: z.string().optional().nullable(),
  internalExtensions: z.string().optional().nullable(),
  mobilePhones: z.string().optional().nullable(),
  filter_exclude_answering_machine: z.boolean().optional(),
  filter_min_duration: z.number().optional(),
  filter_min_replicas: z.number().optional(),
  telegram_daily_report: z.boolean().optional(),
  telegram_manager_report: z.boolean().optional(),
  telegram_weekly_report: z.boolean().optional(),
  telegram_monthly_report: z.boolean().optional(),
  email_daily_report: z.boolean().optional(),
  email_weekly_report: z.boolean().optional(),
  email_monthly_report: z.boolean().optional(),
  report_include_call_summaries: z.boolean().optional(),
  report_detailed: z.boolean().optional(),
  report_include_avg_value: z.boolean().optional(),
  report_include_avg_rating: z.boolean().optional(),
  kpi_base_salary: z.number().optional(),
  kpi_target_bonus: z.number().optional(),
  kpi_target_talk_time_minutes: z.number().optional(),
  telegram_skip_weekends: z.boolean().optional(),
  report_managed_user_ids: z.string().optional().nullable(),
});

const _changePasswordSchema = z.object({
  new_password: z.string().min(1),
  confirm_password: z.string().min(1),
});

export const usersRouter = {
  list: workspaceAdminProcedure.handler(async () => {
    try {
      return await usersService.getAllUsers();
    } catch (error) {
      console.error("[Users] Error in getAllUsers:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Возвращаем пустой массив вместо падения
      return [];
    }
  }),

  get: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new Error("Not authorized");
      const user = await usersService.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      return user;
    }),

  create: workspaceAdminProcedure
    .input(userCreateSchema)
    .handler(async ({ input, context }) => {
      const existing = await usersService.getUserByUsername(input.username);
      if (existing) throw new Error("User with this username already exists");
      const id = await usersService.createUser({
        username: input.username,
        password: input.password,
        givenName: input.givenName,
        familyName: input.familyName ?? "",
        internalExtensions: input.internalExtensions ?? null,
        mobilePhones: input.mobilePhones ?? null,
      });
      await systemRepository.addActivityLog(
        "info",
        `User created: ${input.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      const user = await usersService.getUser(id);
      if (!user) throw new Error("Failed to create user");
      return user;
    }),

  update: workspaceProcedure
    .input(z.object({ user_id: z.string(), data: userUpdateSchema }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new Error("Not authorized");

      // Получаем пользователя до обновления для логирования
      const user = await usersService.getUser(input.user_id);
      if (!user) throw new Error("User not found");

      const d = input.data;
      const u = user as Record<string, unknown>;

      // Выполняем все обновления в рамках одной транзакции через storage layer
      try {
        // Обновляем основную информацию
        const givenName = (d.givenName ?? u.givenName ?? "").toString().trim();
        const familyName = (d.familyName ?? u.familyName ?? "")
          .toString()
          .trim();
        if (!givenName) throw new Error("Given name is required");

        await usersService.updateUserName(input.user_id, {
          givenName,
          familyName,
        });

        // Обновляем дополнительные поля если они изменились
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

        // Обновляем фильтры
        await usersService.updateUserFilters(
          input.user_id,
          d.filter_exclude_answering_machine ??
            (u.filter_exclude_answering_machine as boolean) ??
            false,
          d.filter_min_duration ?? (u.filter_min_duration as number) ?? 0,
          d.filter_min_replicas ?? (u.filter_min_replicas as number) ?? 0,
        );

        // Обновляем настройки отчетов и KPI
        await usersService.updateUserReportKpiSettings(input.user_id, {
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
        });

        // Обновляем настройки Telegram
        await usersService.updateUserTelegramSettings(
          input.user_id,
          d.telegram_daily_report ??
            (u.telegram_daily_report as boolean) ??
            false,
          d.telegram_manager_report ??
            (u.telegram_manager_report as boolean) ??
            false,
        );

        // Логируем успешное обновление
        await systemRepository.addActivityLog(
          "info",
          `User updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        // Получаем обновленные данные
        const updated = await usersService.getUser(input.user_id);
        if (!updated) throw new Error("Failed to retrieve updated user");

        return updated;
      } catch (error) {
        // Логируем ошибку обновления
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );

        throw error;
      }
    }),

  delete: workspaceAdminProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const user = await usersService.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const adminId = (context.user as Record<string, unknown>).id as string;
      if (adminId === input.user_id)
        throw new Error("Cannot delete your own account");
      if (!(await usersService.deleteUser(input.user_id)))
        throw new Error("Failed to delete user");
      await systemRepository.addActivityLog(
        "info",
        `User deleted: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: `User ${user.username} deleted` };
    }),

  changePassword: workspaceAdminProcedure
    .input(
      z.object({
        user_id: z.string(),
        new_password: z.string().min(1),
        confirm_password: z.string().min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = await usersService.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      if (input.new_password !== input.confirm_password)
        throw new Error("Passwords do not match");
      if (
        !(await usersService.updateUserPassword(
          input.user_id,
          input.new_password,
        ))
      )
        throw new Error("Failed to change password");
      await systemRepository.addActivityLog(
        "info",
        `Password changed for user: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: "Password changed successfully" };
    }),

  telegramAuthUrl: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const { workspaceId } = context;
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new Error("Not authorized");
      const user = await usersService.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(16).toString("base64url");
      if (!(await usersService.saveTelegramConnectToken(input.user_id, token)))
        throw new Error("Failed to save token");
      const botToken = await promptsService.getPrompt(
        "telegram_bot_token",
        workspaceId,
      );
      const botUsername = botToken?.trim()
        ? await getBotUsername(botToken)
        : "mango_react_bot";
      return { url: `https://t.me/${botUsername}?start=${token}` };
    }),

  disconnectTelegram: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new Error("Not authorized");
      if (!(await usersService.disconnectTelegram(input.user_id)))
        throw new Error("Failed to disconnect Telegram");
      return { success: true };
    }),

  maxAuthUrl: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new Error("Not authorized");
      const user = await usersService.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(16).toString("base64url");
      if (!(await usersService.saveMaxConnectToken(input.user_id, token)))
        throw new Error("Failed to save token");
      return {
        manual_instruction: `Отправьте боту команду: /start ${token}`,
        token,
      };
    }),

  disconnectMax: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new Error("Not authorized");
      if (!(await usersService.disconnectMax(input.user_id)))
        throw new Error("Failed to disconnect MAX");
      return { success: true };
    }),
};
