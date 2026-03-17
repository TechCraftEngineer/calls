/** Типы для формы настроек отчётов */

export interface ReportSettingsForm {
  email: string;
  email_daily_report: boolean;
  email_weekly_report: boolean;
  email_monthly_report: boolean;
  telegramChatId: string;
  telegram_daily_report: boolean;
  telegram_weekly_report: boolean;
  telegram_monthly_report: boolean;
  telegram_skip_weekends: boolean;
  report_include_call_summaries: boolean;
  report_detailed: boolean;
  report_include_avg_value: boolean;
  report_include_avg_rating: boolean;
  filter_exclude_answering_machine: boolean;
  filter_min_duration: number;
  filter_min_replicas: number;
  kpi_base_salary: number;
  kpi_target_bonus: number;
  kpi_target_talk_time_minutes: number;
  report_daily_time: string;
  report_weekly_day: string;
  report_weekly_time: string;
  report_monthly_day: string;
  report_monthly_time: string;
  report_managed_user_ids: string[];
  maxChatId: string;
  max_daily_report: boolean;
  max_manager_report: boolean;
}

export interface ReportSettingsUserOption {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
}
