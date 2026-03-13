import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../orpc";
import { extractUserFields, formatUserForApi } from "../user-profile";

/**
 * oRPC auth router. Для входа/выхода: POST /api/auth/sign-in/username, authClient.signOut.
 */
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const checkEmailSchema = z.object({
  email: z.string().email(),
});

export const authRouter = {
  login: publicProcedure
    .input(loginSchema)
    .handler(async ({ input, context }) => {
      const ok = await context.authService.verifyPassword(
        input.username.trim(),
        input.password.trim(),
      );
      if (!ok) {
        throw new Error("Invalid credentials");
      }
      const user = await context.usersService.getUserByUsername(
        input.username.trim(),
      );
      if (!user) {
        throw new Error("Invalid credentials");
      }
      // Session is set via Set-Cookie in the handler - we return the user and caller sets cookie
      const fields = extractUserFields(user);
      return {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: fields.username,
          name: user.name,
          givenName: fields.givenName,
          familyName: fields.familyName,
        },
      };
    }),

  logout: publicProcedure.handler(() => {
    return { success: true, message: "Logged out" };
  }),

  checkEmail: publicProcedure
    .input(checkEmailSchema)
    .handler(async ({ input, context }) => {
      const user = await context.usersService.getUserByUsername(
        input.email.trim(),
      );
      return {
        exists: !!user,
      };
    }),

  me: protectedProcedure.handler(async ({ context }) => {
    const u = context.user! as Record<string, unknown>;
    const fields = extractUserFields(u);

    return {
      id: u.id,
      username: fields.username,
      name: u.name,
      givenName: fields.givenName,
      familyName: fields.familyName,
      internalExtensions: fields.internalExtensions,
      mobilePhones: fields.mobilePhones,
      created_at: u.created_at ?? null,
      telegramChatId: fields.telegramChatId,
      telegram_daily_report:
        (u as Record<string, unknown>).telegram_daily_report ?? false,
      telegram_manager_report:
        (u as Record<string, unknown>).telegram_manager_report ?? false,
      max_chat_id: (u as Record<string, unknown>).max_chat_id ?? null,
      max_daily_report:
        (u as Record<string, unknown>).max_daily_report ?? false,
      max_manager_report:
        (u as Record<string, unknown>).max_manager_report ?? false,
      filter_exclude_answering_machine:
        (u as Record<string, unknown>).filter_exclude_answering_machine ??
        false,
      filter_min_duration:
        (u as Record<string, unknown>).filter_min_duration ?? 0,
      filter_min_replicas:
        (u as Record<string, unknown>).filter_min_replicas ?? 0,
      email: (u as Record<string, unknown>).email ?? null,
      telegram_weekly_report:
        (u as Record<string, unknown>).telegram_weekly_report ?? false,
      telegram_monthly_report:
        (u as Record<string, unknown>).telegram_monthly_report ?? false,
      email_daily_report:
        (u as Record<string, unknown>).email_daily_report ?? false,
      email_weekly_report:
        (u as Record<string, unknown>).email_weekly_report ?? false,
      email_monthly_report:
        (u as Record<string, unknown>).email_monthly_report ?? false,
      report_include_call_summaries:
        (u as Record<string, unknown>).report_include_call_summaries ?? false,
      report_detailed: (u as Record<string, unknown>).report_detailed ?? false,
      report_include_avg_value:
        (u as Record<string, unknown>).report_include_avg_value ?? false,
      report_include_avg_rating:
        (u as Record<string, unknown>).report_include_avg_rating ?? false,
      kpi_base_salary: (u as Record<string, unknown>).kpi_base_salary ?? 0,
      kpi_target_bonus: (u as Record<string, unknown>).kpi_target_bonus ?? 0,
      kpi_target_talk_time_minutes:
        (u as Record<string, unknown>).kpi_target_talk_time_minutes ?? 0,
      telegram_skip_weekends:
        (u as Record<string, unknown>).telegram_skip_weekends ?? false,
      report_managed_user_ids:
        (u as Record<string, unknown>).report_managed_user_ids ?? null,
    };
  }),
};
