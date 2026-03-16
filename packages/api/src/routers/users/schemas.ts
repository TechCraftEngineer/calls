import { z } from "zod";

export const userCreateSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Пароль обязателен"),
  givenName: z.string().min(1, "Имя обязательно"),
  familyName: z.string().optional().default(""),
  internalExtensions: z.string().optional().nullable(),
  mobilePhones: z.string().optional().nullable(),
});

export const userUpdateSchema = z.object({
  givenName: z.string().optional(),
  familyName: z.string().optional().nullable(),
  internalExtensions: z.string().optional().nullable(),
  mobilePhones: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  filter_exclude_answering_machine: z.boolean().optional(),
  filter_min_duration: z.number().optional(),
  filter_min_replicas: z.number().optional(),
  telegram_daily_report: z.boolean().optional(),
  telegram_manager_report: z.boolean().optional(),
  telegram_weekly_report: z.boolean().optional(),
  telegram_monthly_report: z.boolean().optional(),
  email_daily_report: z.boolean().optional(),
  email_weekly_report: z.boolean().optional(),
  email_monthly_report: z.boolean().optional(),
  report_include_call_summaries: z.boolean().optional(),
  report_detailed: z.boolean().optional(),
  report_include_avg_value: z.boolean().optional(),
  report_include_avg_rating: z.boolean().optional(),
  kpi_base_salary: z.number().optional(),
  kpi_target_bonus: z.number().optional(),
  kpi_target_talk_time_minutes: z.number().optional(),
  telegram_skip_weekends: z.boolean().optional(),
  report_managed_user_ids: z.string().optional().nullable(),
  evaluation_template_slug: z
    .enum(["sales", "support", "general"])
    .optional()
    .nullable(),
  evaluation_custom_instructions: z.string().optional().nullable(),
});

export const updateBasicInfoSchema = z.object({
  givenName: z.string().min(1, "Имя обязательно для заполнения"),
  familyName: z.string().optional(),
  internalExtensions: z.string().optional(),
  mobilePhones: z.string().optional(),
});

export const updateEmailSettingsSchema = z.object({
  email: z.string().email("Некорректный email").optional().nullable(),
  email_daily_report: z.boolean().optional(),
  email_weekly_report: z.boolean().optional(),
  email_monthly_report: z.boolean().optional(),
});

export const updateTelegramSettingsSchema = z.object({
  telegram_daily_report: z.boolean().optional(),
  telegram_manager_report: z.boolean().optional(),
  telegram_weekly_report: z.boolean().optional(),
  telegram_monthly_report: z.boolean().optional(),
});

export const updateMaxSettingsSchema = z.object({
  max_daily_report: z.boolean().optional(),
  max_manager_report: z.boolean().optional(),
});

export const updateReportSettingsSchema = z.object({
  report_include_call_summaries: z.boolean().optional(),
  report_detailed: z.boolean().optional(),
  report_include_avg_value: z.boolean().optional(),
  report_include_avg_rating: z.boolean().optional(),
});

export const updateKpiSettingsSchema = z.object({
  kpi_base_salary: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  kpi_target_bonus: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  kpi_target_talk_time_minutes: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
});

export const updateFilterSettingsSchema = z.object({
  filter_exclude_answering_machine: z.boolean().optional(),
  filter_min_duration: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  filter_min_replicas: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
});
