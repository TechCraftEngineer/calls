import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../orpc";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = {
  login: publicProcedure
    .input(loginSchema)
    .handler(async ({ input, context }) => {
      const ok = context.storage.verifyPassword(
        input.username.trim(),
        input.password.trim(),
      );
      if (!ok) {
        throw new Error("Invalid credentials");
      }
      const user = context.storage.getUserByUsername(input.username.trim());
      if (!user) {
        throw new Error("Invalid credentials");
      }
      // Session is set via Set-Cookie in the handler - we return the user and caller sets cookie
      return {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          first_name: user.first_name ?? "",
          last_name: user.last_name ?? "",
        },
      };
    }),

  logout: publicProcedure.handler(() => {
    return { success: true, message: "Logged out" };
  }),

  me: protectedProcedure.handler(async ({ context }) => {
    const u = context.user!;
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      first_name: (u as Record<string, unknown>).first_name ?? "",
      last_name: (u as Record<string, unknown>).last_name ?? "",
      internal_numbers: (u as Record<string, unknown>).internal_numbers ?? null,
      mobile_numbers: (u as Record<string, unknown>).mobile_numbers ?? null,
      created_at: (u as Record<string, unknown>).created_at ?? null,
      telegram_chat_id: (u as Record<string, unknown>).telegram_chat_id ?? null,
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
