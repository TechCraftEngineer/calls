/**
 * Строгие TypeScript интерфейсы для пользовательских данных
 * Унифицированные типы для использования во всем приложении
 */

// Базовые поля пользователя (OIDC + domain стандарты)
export interface BaseUserFields {
  id: string | number;
  username: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Дополнительные поля пользователя (additional fields)
export interface UserAdditionalFields {
  givenName?: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
  telegramChatId?: string | null;
}

// Полный интерфейс пользователя
export interface User extends BaseUserFields, UserAdditionalFields {
  role?: "admin" | "user";
  is_active?: boolean;
}

// Пользователь из API ответа
export interface ApiUser extends User {
  id: number;
  created_at?: string | null;
}

// Пользователь из Better Auth
export interface BetterAuthUser extends BaseUserFields, UserAdditionalFields {
  // Better Auth специфичные поля
  bio?: string;
  language?: string;
}

// Данные для создания пользователя
export interface CreateUserData {
  username: string;
  password: string;
  givenName: string;
  familyName?: string;
  internalExtensions?: string;
  mobilePhones?: string;
}

// Данные для обновления пользователя
export interface UpdateUserData {
  givenName?: string;
  familyName?: string;
  internalExtensions?: string;
  mobilePhones?: string;
  email?: string;
  is_active?: boolean;
}

// Настройки отчетов пользователя
export interface UserReportSettings {
  email?: string;
  email_daily_report: boolean;
  email_weekly_report: boolean;
  email_monthly_report: boolean;
  telegramChatId?: string;
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
  report_daily_time: string; // HH:MM format
  report_weekly_day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  report_weekly_time: string; // HH:MM format
  report_monthly_day: "1" | "15" | "last";
  report_monthly_time: string; // HH:MM format
  report_managed_user_ids: number[];
}

// Полные настройки пользователя включая отчеты
export interface UserSettings extends UserAdditionalFields {
  username?: string;
  email?: string;
  report_managed_user_ids?: unknown;
  email_daily_report?: unknown;
  email_weekly_report?: unknown;
  email_monthly_report?: unknown;
  telegram_daily_report?: unknown;
  telegram_weekly_report?: unknown;
  telegram_monthly_report?: unknown;
  telegram_skip_weekends?: unknown;
  report_include_call_summaries?: unknown;
  report_detailed?: unknown;
  report_include_avg_value?: unknown;
  report_include_avg_rating?: unknown;
  filter_exclude_answering_machine?: unknown;
  filter_min_duration?: unknown;
  filter_min_replicas?: unknown;
  kpi_base_salary?: unknown;
  kpi_target_bonus?: unknown;
  kpi_target_talk_time_minutes?: unknown;
  report_daily_time?: unknown;
  report_weekly_day?: unknown;
  report_weekly_time?: unknown;
  report_monthly_day?: unknown;
  report_monthly_time?: unknown;
  max_chat_id?: string;
  max_daily_report?: boolean;
  max_manager_report?: boolean;
}

// Типы для аутентификации
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  newPassword: string;
  confirmPassword: string;
}

// Типы для Telegram интеграции
export interface TelegramAuth {
  chatId?: string;
  dailyReport?: boolean;
  managerReport?: boolean;
}

// Типы для MAX CRM интеграции
export interface MaxAuth {
  chatId?: string;
  dailyReport?: boolean;
  managerReport?: boolean;
}

// Утилитарные типы
export type UserLike = Record<string, unknown>;
export type PartialUser = Partial<User>;

// Типы для API ответов
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface ApiError {
  detail: string;
  code?: string;
}

// Типы для пагинации
export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}
