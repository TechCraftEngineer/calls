/**
 * Zod схемы валидации для форм
 */

import { z } from "zod";

// Схема для формы входа
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Email обязателен")
    .email("Введите корректный email адрес"),
  password: z
    .string()
    .min(1, "Пароль обязателен")
    .min(6, "Пароль должен содержать минимум 6 символов"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Схема для создания пользователя
export const createUserSchema = z
  .object({
    username: z
      .string()
      .min(1, "Email обязателен")
      .email("Введите корректный email адрес"),
    password: z
      .string()
      .min(6, "Пароль должен содержать минимум 6 символов")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
      .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
      .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
    confirmPassword: z.string(),
    first_name: z.string().min(1, "Имя обязательно"),
    last_name: z.string().optional(),
    internal_numbers: z.string().optional(),
    mobile_numbers: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type CreateUserData = z.infer<typeof createUserSchema>;

// Схема для обновления пользователя
export const updateUserSchema = z.object({
  first_name: z.string().min(1, "Имя обязательно").optional(),
  last_name: z.string().optional(),
  internal_numbers: z.string().optional(),
  mobile_numbers: z.string().optional(),
  email: z.string().email("Введите корректный email").optional(),
  is_active: z.boolean().optional(),
});

export type UpdateUserData = z.infer<typeof updateUserSchema>;

// Схема для смены пароля
export const changePasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(6, "Пароль должен содержать минимум 6 символов")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
      .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
      .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Пароли не совпадают",
    path: ["confirm_password"],
  });

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// Схема для настроек отчетов
export const reportSettingsSchema = z.object({
  email: z.string().email("Введите корректный email").optional(),
  email_daily_report: z.boolean(),
  email_weekly_report: z.boolean(),
  email_monthly_report: z.boolean(),
  telegram_chat_id: z.string().optional(),
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
