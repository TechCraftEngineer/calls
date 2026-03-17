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
  filterExcludeAnsweringMachine: z.boolean().optional(),
  filterMinDuration: z.number().optional(),
  filterMinReplicas: z.number().optional(),
  telegramDailyReport: z.boolean().optional(),
  telegramManagerReport: z.boolean().optional(),
  telegramWeeklyReport: z.boolean().optional(),
  telegramMonthlyReport: z.boolean().optional(),
  emailDailyReport: z.boolean().optional(),
  emailWeeklyReport: z.boolean().optional(),
  emailMonthlyReport: z.boolean().optional(),
  reportIncludeCallSummaries: z.boolean().optional(),
  reportDetailed: z.boolean().optional(),
  reportIncludeAvgValue: z.boolean().optional(),
  reportIncludeAvgRating: z.boolean().optional(),
  kpiBaseSalary: z.number().optional(),
  kpiTargetBonus: z.number().optional(),
  kpiTargetTalkTimeMinutes: z.number().optional(),
  telegramSkipWeekends: z.boolean().optional(),
  reportManagedUserIds: z.string().optional().nullable(),
  evaluationTemplateSlug: z
    .enum(["sales", "support", "general"])
    .optional()
    .nullable(),
  evaluationCustomInstructions: z.string().optional().nullable(),
});

export const updateBasicInfoSchema = z.object({
  givenName: z.string().min(1, "Имя обязательно для заполнения"),
  familyName: z.string().optional(),
  internalExtensions: z.string().optional(),
  mobilePhones: z.string().optional(),
});

export const updateEmailSettingsSchema = z.object({
  email: z.string().email("Некорректный email").optional().nullable(),
  emailDailyReport: z.boolean().optional(),
  emailWeeklyReport: z.boolean().optional(),
  emailMonthlyReport: z.boolean().optional(),
});

export const updateTelegramSettingsSchema = z.object({
  telegramDailyReport: z.boolean().optional(),
  telegramManagerReport: z.boolean().optional(),
  telegramWeeklyReport: z.boolean().optional(),
  telegramMonthlyReport: z.boolean().optional(),
});

export const updateMaxSettingsSchema = z.object({
  maxChatId: z.string().optional().nullable(),
  maxDailyReport: z.boolean().optional(),
  maxManagerReport: z.boolean().optional(),
});

export const updateReportSettingsSchema = z.object({
  reportIncludeCallSummaries: z.boolean().optional(),
  reportDetailed: z.boolean().optional(),
  reportIncludeAvgValue: z.boolean().optional(),
  reportIncludeAvgRating: z.boolean().optional(),
});

export const updateKpiSettingsSchema = z.object({
  kpiBaseSalary: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  kpiTargetBonus: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  kpiTargetTalkTimeMinutes: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
});

export const updateFilterSettingsSchema = z.object({
  filterExcludeAnsweringMachine: z.boolean().optional(),
  filterMinDuration: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
  filterMinReplicas: z
    .number()
    .min(0, "Значение не может быть отрицательным")
    .optional(),
});
