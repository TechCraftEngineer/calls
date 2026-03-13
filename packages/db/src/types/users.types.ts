/**
 * Types related to users operations
 */

export interface UserUpdateData {
  filter_exclude_answering_machine?: boolean;
  filter_min_duration?: number;
  filter_min_replicas?: number;
  telegram_daily_report?: boolean;
  telegram_manager_report?: boolean;
  telegram_weekly_report?: boolean;
  telegram_monthly_report?: boolean;
  telegram_skip_weekends?: boolean;
  email_daily_report?: boolean;
  email_weekly_report?: boolean;
  email_monthly_report?: boolean;
  report_include_call_summaries?: boolean;
  report_detailed?: boolean;
  report_include_avg_value?: boolean;
  report_include_avg_rating?: boolean;
  report_managed_user_ids?: string | null;
  kpi_base_salary?: number;
  kpi_target_bonus?: number;
  kpi_target_talk_time_minutes?: number;
}

export interface CreateUserData {
  username: string;
  password: string;
  givenName: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}

export interface UpdateUserData {
  givenName?: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}
