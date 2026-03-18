import { protectedProcedure } from "../../orpc";
import type { UserLike } from "../../types/user";
import { extractUserFields } from "../../user-profile";

export const me = protectedProcedure.handler(async ({ context }) => {
  const u = context.user as UserLike;
  const fields = extractUserFields(u);

  return {
    id: u.id,
    email: fields.email,
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
    max_daily_report: (u as Record<string, unknown>).max_daily_report ?? false,
    max_manager_report:
      (u as Record<string, unknown>).max_manager_report ?? false,
    filter_exclude_answering_machine:
      (u as Record<string, unknown>).filter_exclude_answering_machine ?? false,
    filter_min_duration:
      (u as Record<string, unknown>).filter_min_duration ?? 0,
    filter_min_replicas:
      (u as Record<string, unknown>).filter_min_replicas ?? 0,
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
});
