/**
 * Zod схемы валидации для форм
 */

import { z } from "zod";

// Схема для формы входа (email)
export const loginSchema = z.object({
  email: z.string().min(1, "Введите email").email("Введите корректный email"),
  password: z
    .string()
    .min(1, "Пароль обязателен")
    .min(6, "Пароль должен содержать минимум 6 символов"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Схема для «Забыли пароль» — только формат email, без проверки существования
// (защита от перебора: не раскрываем, зарегистрирован ли email)
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Введите email").email("Введите корректный email"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Схема для сброса пароля (min 8 — по стандарту Better Auth)
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Пароль должен содержать минимум 8 символов")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
      .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
      .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Схема для создания пользователя
export const createUserSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z
    .string()
    .min(6, "Пароль должен содержать минимум 6 символов")
    .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
    .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
    .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
  givenName: z.string().min(1, "Имя обязательно"),
  familyName: z.string().optional(),
  internalExtensions: z.string().optional(),
  mobilePhones: z.string().optional(),
});

export type CreateUserData = z.infer<typeof createUserSchema>;

// Схема для обновления пользователя
export const updateUserSchema = z.object({
  givenName: z.string().min(1, "Имя обязательно").optional(),
  familyName: z.string().optional(),
  internalExtensions: z.string().optional(),
  mobilePhones: z.string().optional(),
  email: z.string().email("Введите корректный email").optional(),
  is_active: z.boolean().optional(),
});

export type UpdateUserData = z.infer<typeof updateUserSchema>;

// Схема для настроек отчетов
export const reportSettingsSchema = z.object({
  email: z.string().email("Введите корректный email").optional(),
  email_daily_report: z.boolean(),
  email_weekly_report: z.boolean(),
  email_monthly_report: z.boolean(),
  telegramChatId: z.string().optional(),
  telegram_daily_report: z.boolean(),
  telegram_weekly_report: z.boolean(),
  telegram_monthly_report: z.boolean(),
  telegram_skip_weekends: z.boolean(),
  report_include_call_summaries: z.boolean(),
  report_detailed: z.boolean(),
  report_include_avg_value: z.boolean(),
  report_include_avg_rating: z.boolean(),
  filter_exclude_answering_machine: z.boolean(),
  filter_min_duration: z.number().min(0),
  filter_min_replicas: z.number().min(0),
  kpi_base_salary: z.number().min(0),
  kpi_target_bonus: z.number().min(0),
  kpi_target_talk_time_minutes: z.number().min(0),
  report_daily_time: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Формат времени HH:MM"),
  report_weekly_day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  report_weekly_time: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Формат времени HH:MM"),
  report_monthly_day: z.enum(["1", "15", "last"]),
  report_monthly_time: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Формат времени HH:MM"),
  report_managed_user_ids: z.array(z.number()),
});

export type ReportSettingsData = z.infer<typeof reportSettingsSchema>;
