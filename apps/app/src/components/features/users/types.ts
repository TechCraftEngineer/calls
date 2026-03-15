import type { User } from "@/lib/auth";

// Расширенный тип пользователя с полями управления
export interface ManagedUser extends Omit<User, "id"> {
  id: string;
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
  email?: string;
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
}

// Форма создания пользователя
export interface AddUserForm {
  username: string;
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
  email: string;
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
}

// Форма редактирования пользователя (без логина и пароля)
export type EditUserForm = Omit<AddUserForm, "username" | "password">;

// CSS классы для модальных окон
export const modalOverlayClasses =
  "fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]";
export const modalBoxClasses =
  "bg-white rounded-xl p-6 max-w-[440px] w-full max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)]";
export const formFieldWrap = "mb-3";
export const formLabel = "block mb-1 text-[13px] font-semibold";
export const formInput =
  "w-full py-2 px-3 border border-[#ddd] rounded-md box-border";
