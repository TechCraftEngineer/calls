import type { User } from "@/lib/auth";

/** Пользователь из API users.list (workspace members) */
export interface WorkspaceMemberUser {
  id: string;
  memberId: string;
  userId: string;
  role: string;
  email: string;
  name: string;
  givenName: string | null;
  familyName: string | null;
  internalExtensions: string | null;
  mobilePhones: string | null;
  created_at: string | null;
  telegramChatId: string | null;
  evaluation_template_slug: "sales" | "support" | "general" | null;
}

// Расширенный тип пользователя с полями управления
export interface ManagedUser extends Omit<User, "id" | "email"> {
  id: string;
  email: string;
  userId?: string;
  role?: "owner" | "admin" | "member";
  internalExtensions?: string;
  mobilePhones?: string;
  created_at?: string;
  givenName?: string;
  familyName?: string;
  telegramChatId?: string;
  telegram_daily_report?: boolean;
  telegram_manager_report?: boolean;
  max_chat_id?: string;
  max_daily_report?: boolean;
  max_manager_report?: boolean;
  filter_exclude_answering_machine?: boolean;
  filter_min_duration?: number;
  filter_min_replicas?: number;
  email_daily_report?: boolean;
  email_weekly_report?: boolean;
  email_monthly_report?: boolean;
  telegram_weekly_report?: boolean;
  telegram_monthly_report?: boolean;
  report_include_call_summaries?: boolean;
  report_detailed?: boolean;
  report_include_avg_value?: boolean;
  report_include_avg_rating?: boolean;
  kpi_base_salary?: number;
  kpi_target_bonus?: number;
  kpi_target_talk_time_minutes?: number;
  evaluation_template_slug?: string | null;
  evaluation_custom_instructions?: string | null;
}

// Форма создания пользователя
export interface AddUserForm {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  internalExtensions: string;
  mobilePhones: string;
  telegramChatId: string;
  telegram_daily_report: boolean;
  telegram_manager_report: boolean;
  max_chat_id: string;
  max_daily_report: boolean;
  max_manager_report: boolean;
  filter_exclude_answering_machine: boolean;
  filter_min_duration: number;
  filter_min_replicas: number;
  email_daily_report: boolean;
  email_weekly_report: boolean;
  email_monthly_report: boolean;
  telegram_weekly_report: boolean;
  telegram_monthly_report: boolean;
  report_include_call_summaries: boolean;
  report_detailed: boolean;
  report_include_avg_value: boolean;
  report_include_avg_rating: boolean;
  kpi_base_salary: number;
  kpi_target_bonus: number;
  kpi_target_talk_time_minutes: number;
  evaluation_template_slug: string | null;
  evaluation_custom_instructions: string | null;
}

// Форма редактирования пользователя (без пароля)
export type EditUserForm = Omit<AddUserForm, "password">;

// CSS классы для модальных окон
export const modalOverlayClasses =
  "fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]";
export const modalBoxClasses =
  "bg-white rounded-xl p-6 max-w-[440px] w-full max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)]";
export const formFieldWrap = "mb-3";
export const formLabel = "block mb-1 text-[13px] font-semibold";
export const formInput =
  "w-full py-2 px-3 border border-[#ddd] rounded-md box-border";
