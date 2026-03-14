import { randomBytes } from "node:crypto";
import { promptsService, systemRepository, usersService } from "@calls/db";
import { getBotUsername } from "@calls/telegram-bot";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { WorkspaceRole } from "../orpc";
import { workspaceAdminProcedure, workspaceProcedure } from "../orpc";
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
  email: z.string().optional().nullable(),
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

// Схемы для частичного обновления полей
const updateBasicInfoSchema = z.object({
  givenName: z.string().min(1, "Имя обязательно для заполнения"),
  familyName: z.string().optional(),
  internalExtensions: z.string().optional(),
  mobilePhones: z.string().optional(),
});

const updateEmailSettingsSchema = z.object({
  email: z.string().email("Некорректный email").optional().nullable(),
  email_daily_report: z.boolean().optional(),
  email_weekly_report: z.boolean().optional(),
  email_monthly_report: z.boolean().optional(),
});

const updateTelegramSettingsSchema = z.object({
  telegram_daily_report: z.boolean().optional(),
  telegram_manager_report: z.boolean().optional(),
  telegram_weekly_report: z.boolean().optional(),
  telegram_monthly_report: z.boolean().optional(),
});

const updateMaxSettingsSchema = z.object({
  max_daily_report: z.boolean().optional(),
  max_manager_report: z.boolean().optional(),
});

const updateReportSettingsSchema = z.object({
  report_include_call_summaries: z.boolean().optional(),
  report_detailed: z.boolean().optional(),
  report_include_avg_value: z.boolean().optional(),
  report_include_avg_rating: z.boolean().optional(),
});

const updateKpiSettingsSchema = z.object({
  kpi_base_salary: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  kpi_target_bonus: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  kpi_target_talk_time_minutes: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
});

const updateFilterSettingsSchema = z.object({
  filter_exclude_answering_machine: z.boolean().optional(),
  filter_min_duration: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  filter_min_replicas: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
});

export const usersRouter = {
  list: workspaceAdminProcedure.handler(async ({ context }) => {
    const { workspaceId, workspacesService } = context;
    try {
      const rows = await workspacesService.getMembers(workspaceId);
      return rows.map((r: { user: Record<string, unknown> }) => {
        const u = r.user;
        return {
          id: u.id,
          username: u.username ?? u.email,
          name: u.name ?? "",
          givenName: u.givenName,
          familyName: u.familyName,
          internalExtensions: u.internalExtensions,
          mobilePhones: u.mobilePhones,
          created_at: (u.createdAt as Date)?.toISOString?.() ?? u.createdAt,
          telegramChatId: u.telegramChatId,
        };
      });
    } catch (error) {
      console.error("[Users] Error in list workspace members:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось загрузить список пользователей",
      });
    }
  }),

  get: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому пользователю",
        });
      const user = await usersService.getUser(input.user_id);
      if (!user)
        throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
      return user;
    }),

  create: workspaceAdminProcedure
    .input(userCreateSchema)
    .handler(async ({ input, context }) => {
      const existing = await usersService.getUserByUsername(input.username);
      if (existing)
        throw new ORPCError("CONFLICT", {
          message: "Пользователь с таким логином уже существует",
        });
      const id = await usersService.createUser({
        username: input.username,
        password: input.password,
        givenName: input.givenName,
        familyName: input.familyName ?? "",
        internalExtensions: input.internalExtensions ?? null,
        mobilePhones: input.mobilePhones ?? null,
      });
      if (context.workspaceId) {
        await context.workspacesService.addMember({
          workspaceId: context.workspaceId,
          userId: id,
          role: "member",
        });
      }
      await systemRepository.addActivityLog(
        "info",
        `User created: ${input.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      const user = await usersService.getUser(id);
      if (!user)
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось создать пользователя",
        });
      return user;
    }),

  update: workspaceProcedure
    .input(z.object({ user_id: z.string(), data: userUpdateSchema }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому пользователю",
        });

      // Получаем пользователя до обновления для логирования
      const user = await usersService.getUser(input.user_id);
      if (!user)
        throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

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

        if (d.email !== undefined) {
          await usersService.updateUserEmail(input.user_id, d.email);
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
        if (!updated)
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Не удалось получить обновлённые данные",
          });

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
      if (!user)
        throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
      const adminId = (context.user as Record<string, unknown>).id as string;
      if (adminId === input.user_id)
        throw new ORPCError("BAD_REQUEST", {
          message: "Нельзя удалить свой аккаунт",
        });
      if (context.workspaceId) {
        await context.workspacesService.removeMember(
          context.workspaceId,
          input.user_id,
        );
      } else {
        if (!(await usersService.deleteUser(input.user_id)))
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Не удалось удалить пользователя",
          });
      }
      await systemRepository.addActivityLog(
        "info",
        context.workspaceId
          ? `Пользователь исключён из workspace: ${user.username}`
          : `Пользователь удалён: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return {
        success: true,
        message: context.workspaceId
          ? `Пользователь ${user.username} исключён из workspace`
          : `Пользователь ${user.username} удалён`,
      };
    }),

  changePassword: workspaceAdminProcedure
    .input(
      z.object({
        user_id: z.string(),
        new_password: z
          .string()
          .min(8, "Пароль должен содержать минимум 8 символов"),
        confirm_password: z.string().min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = await usersService.getUser(input.user_id);
      if (!user)
        throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

      if (input.new_password !== input.confirm_password)
        throw new ORPCError("BAD_REQUEST", {
          message: "Пароли не совпадают",
        });

      // Use Better Auth admin API to set password
      try {
        // Import auth from app-server
        const { auth } = await import("@calls/app-server/auth");

        await auth.api.setUserPassword({
          body: {
            userId: input.user_id,
            newPassword: input.new_password,
          },
        });

        await systemRepository.addActivityLog(
          "info",
          `Password changed for user: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        return { success: true, message: "Password changed successfully" };
      } catch (error) {
        console.error("[Users] Error changing password:", error);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось изменить пароль",
        });
      }
    }),

  telegramAuthUrl: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const { workspaceId } = context;
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому пользователю",
        });
      const user = await usersService.getUser(input.user_id);
      if (!user)
        throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
      const token = randomBytes(16).toString("base64url");
      if (!(await usersService.saveTelegramConnectToken(input.user_id, token)))
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось сохранить токен",
        });
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
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому пользователю",
        });
      if (!(await usersService.disconnectTelegram(input.user_id)))
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось отключить Telegram",
        });
      return { success: true };
    }),

  maxAuthUrl: workspaceProcedure
    .input(z.object({ user_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as string;
      if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому пользователю",
        });
      const user = await usersService.getUser(input.user_id);
      if (!user)
        throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
      const token = randomBytes(16).toString("base64url");
      if (!(await usersService.saveMaxConnectToken(input.user_id, token)))
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось сохранить токен",
        });
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
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому пользователю",
        });
      if (!(await usersService.disconnectMax(input.user_id)))
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось отключить MAX",
        });
      return { success: true };
    }),

  // Новые эндпоинты для частичного обновления
  updateBasicInfo: workspaceProcedure
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
        // Обновляем основную информацию
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

        await systemRepository.addActivityLog(
          "info",
          `User basic info updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user basic info ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),

  updateEmailSettings: workspaceProcedure
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

        // Обновляем настройки email отчетов через общий метод
        await usersService.updateUserReportKpiSettings(input.user_id, {
          emailDailyReport: input.data.email_daily_report,
          emailWeeklyReport: input.data.email_weekly_report,
          emailMonthlyReport: input.data.email_monthly_report,
        });

        await systemRepository.addActivityLog(
          "info",
          `User email settings updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user email settings ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),

  updateTelegramSettings: workspaceProcedure
    .input(
      z.object({ user_id: z.string(), data: updateTelegramSettingsSchema }),
    )
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
        await usersService.updateUserReportKpiSettings(input.user_id, {
          telegramDailyReport: input.data.telegram_daily_report,
          telegramManagerReport: input.data.telegram_manager_report,
          telegramWeeklyReport: input.data.telegram_weekly_report,
          telegramMonthlyReport: input.data.telegram_monthly_report,
        });

        await systemRepository.addActivityLog(
          "info",
          `User telegram settings updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user telegram settings ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),

  updateMaxSettings: workspaceProcedure
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
        await usersService.updateUserReportKpiSettings(input.user_id, {
          maxDailyReport: input.data.max_daily_report,
          maxManagerReport: input.data.max_manager_report,
        });

        await systemRepository.addActivityLog(
          "info",
          `User max settings updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user max settings ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),

  updateReportSettings: workspaceProcedure
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
        await usersService.updateUserReportKpiSettings(input.user_id, {
          reportIncludeCallSummaries: input.data.report_include_call_summaries,
          reportDetailed: input.data.report_detailed,
          reportIncludeAvgValue: input.data.report_include_avg_value,
          reportIncludeAvgRating: input.data.report_include_avg_rating,
        });

        await systemRepository.addActivityLog(
          "info",
          `User report settings updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user report settings ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),

  updateKpiSettings: workspaceProcedure
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
        await usersService.updateUserReportKpiSettings(input.user_id, {
          kpiBaseSalary: input.data.kpi_base_salary,
          kpiTargetBonus: input.data.kpi_target_bonus,
          kpiTargetTalkTimeMinutes: input.data.kpi_target_talk_time_minutes,
        });

        await systemRepository.addActivityLog(
          "info",
          `User KPI settings updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user KPI settings ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),

  updateFilterSettings: workspaceProcedure
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
          input.data.filter_exclude_answering_machine ?? false,
          input.data.filter_min_duration ?? 0,
          input.data.filter_min_replicas ?? 0,
        );

        await systemRepository.addActivityLog(
          "info",
          `User filter settings updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        const updated = await usersService.getUser(input.user_id);
        return updated;
      } catch (error) {
        await systemRepository.addActivityLog(
          "error",
          `Failed to update user filter settings ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );
        throw error;
      }
    }),
};
