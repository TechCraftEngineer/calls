import { randomBytes } from "node:crypto";
import { storage } from "@calls/db";
import { getBotUsername } from "@calls/telegram-bot";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../orpc";
import { isAdminUser } from "../user-profile";

async function canAccessUser(
  currentUserId: number,
  targetUserId: number,
): Promise<boolean> {
  if (currentUserId === targetUserId) return true;
  const user = await storage.getUser(currentUserId);
  if (!user) return false;
  return isAdminUser(user as Record<string, unknown>);
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
  list: adminProcedure.handler(async () => {
    try {
      return await storage.getAllUsers();
    } catch (error) {
      console.error("[Users] Error in getAllUsers:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Возвращаем пустой массив вместо падения
      return [];
    }
  }),

  get: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      return user;
    }),

  create: adminProcedure
    .input(userCreateSchema)
    .handler(async ({ input, context }) => {
      const existing = await storage.getUserByUsername(input.username);
      if (existing) throw new Error("User with this username already exists");
      const id = await storage.createUser(
        input.username,
        input.password,
        input.givenName,
        input.familyName ?? "",
        input.internalExtensions ?? null,
        input.mobilePhones ?? null,
      );
      await storage.addActivityLog(
        "info",
        `User created: ${input.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      const user = await storage.getUser(id);
      if (!user) throw new Error("Failed to create user");
      return user;
    }),

  update: protectedProcedure
    .input(z.object({ user_id: z.number(), data: userUpdateSchema }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");

      // Получаем пользователя до обновления для логирования
      const user = await storage.getUser(input.user_id);
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

        await storage.updateUserName(input.user_id, givenName, familyName);

        // Обновляем дополнительные поля если они изменились
        if (d.internalExtensions !== undefined) {
          await storage.updateUserInternalExtensions(
            input.user_id,
            d.internalExtensions,
          );
        }

        if (d.mobilePhones !== undefined) {
          await storage.updateUserMobilePhones(input.user_id, d.mobilePhones);
        }

        // Обновляем фильтры
        await storage.updateUserFilters(
          input.user_id,
          d.filter_exclude_answering_machine ??
            (u.filter_exclude_answering_machine as boolean) ??
            false,
          d.filter_min_duration ?? (u.filter_min_duration as number) ?? 0,
          d.filter_min_replicas ?? (u.filter_min_replicas as number) ?? 0,
        );

        // Обновляем настройки отчетов и KPI
        await storage.updateUserReportKpiSettings(input.user_id, d);

        // Обновляем настройки Telegram
        await storage.updateUserTelegramSettings(
          input.user_id,
          (u.telegramChatId as string) ?? null,
          d.telegram_daily_report ??
            (u.telegram_daily_report as boolean) ??
            false,
          d.telegram_manager_report ??
            (u.telegram_manager_report as boolean) ??
            false,
        );

        // Логируем успешное обновление
        await storage.addActivityLog(
          "info",
          `User updated: ${user.username}`,
          (context.user as Record<string, unknown>).username as string,
        );

        // Получаем обновленные данные
        const updated = await storage.getUser(input.user_id);
        if (!updated) throw new Error("Failed to retrieve updated user");

        return updated;
      } catch (error) {
        // Логируем ошибку обновления
        await storage.addActivityLog(
          "error",
          `Failed to update user ${user.username}: ${error instanceof Error ? error.message : String(error)}`,
          (context.user as Record<string, unknown>).username as string,
        );

        throw error;
      }
    }),

  delete: adminProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const adminId = (context.user as Record<string, unknown>).id as number;
      if (adminId === input.user_id)
        throw new Error("Cannot delete your own account");
      if (!(await storage.deleteUser(input.user_id)))
        throw new Error("Failed to delete user");
      await storage.addActivityLog(
        "info",
        `User deleted: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: `User ${user.username} deleted` };
    }),

  changePassword: adminProcedure
    .input(
      z.object({
        user_id: z.number(),
        new_password: z.string().min(1),
        confirm_password: z.string().min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      if (input.new_password !== input.confirm_password)
        throw new Error("Passwords do not match");
      if (
        !(await storage.updateUserPassword(input.user_id, input.new_password))
      )
        throw new Error("Failed to change password");
      await storage.addActivityLog(
        "info",
        `Password changed for user: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: "Password changed successfully" };
    }),

  telegramAuthUrl: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(16).toString("base64url");
      if (!(await storage.saveTelegramConnectToken(input.user_id, token)))
        throw new Error("Failed to save token");
      const botToken = await storage.getPrompt("telegram_bot_token");
      const botUsername = botToken?.trim()
        ? await getBotUsername(botToken)
        : "mango_react_bot";
      return { url: `https://t.me/${botUsername}?start=${token}` };
    }),

  disconnectTelegram: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      if (!(await storage.disconnectTelegram(input.user_id)))
        throw new Error("Failed to disconnect Telegram");
      return { success: true };
    }),

  maxAuthUrl: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(16).toString("base64url");
      if (!(await storage.saveMaxConnectToken(input.user_id, token)))
        throw new Error("Failed to save token");
      return {
        manual_instruction: `Отправьте боту команду: /start ${token}`,
        token,
      };
    }),

  disconnectMax: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      if (!(await storage.disconnectMax(input.user_id)))
        throw new Error("Failed to disconnect MAX");
      return { success: true };
    }),
};
