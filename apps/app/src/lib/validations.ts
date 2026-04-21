/**
 * Zod схемы валидации для форм
 */

import { z } from "zod";

// Общая схема валидации пароля с требованиями сложности
const passwordValidation = z
  .string()
  .min(8, "Пароль должен содержать минимум 8 символов")
  .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
  .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
  .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру");

// Схема для формы входа (email)
export const loginSchema = z.object({
  email: z.string().min(1, "Введите email").email("Введите корректный email"),
  password: z
    .string()
    .min(1, "Пароль обязателен")
    .min(8, "Пароль должен содержать минимум 8 символов"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Схема для «Забыли пароль» — только формат email, без проверки существования
// (защита от перебора: не раскрываем, зарегистрирован ли email)
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Введите email").email("Введите корректный email"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Схема для сброса пароля
export const resetPasswordSchema = z.object({
  newPassword: passwordValidation,
});
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Схема для смены пароля (в настройках аккаунта)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: passwordValidation,
});
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Схема для обновления профиля (имя)
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(200, "Имя слишком длинное"),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// Схема для создания пользователя
export const createUserSchema = z.object({
  email: z.email("Введите корректный email"),
  password: passwordValidation,
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
  email: z.email("Введите корректный email").optional(),
  is_active: z.boolean().optional(),
});

export type UpdateUserData = z.infer<typeof updateUserSchema>;

// Схема для принятия приглашения (создание аккаунта по ссылке)
export const inviteAcceptSchema = z.object({
  name: z.string().optional(),
  email: z.email("Введите корректный email").optional(),
  password: passwordValidation,
});

// Динамическая схема для link-based приглашений (email обязателен)
export const inviteAcceptLinkSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, "Email обязателен").email("Введите корректный email"),
  password: passwordValidation,
});

export type InviteAcceptData = z.infer<typeof inviteAcceptSchema>;

// Схема валидации формы редактирования пользователя (подмножество полей)
export const editUserFormSchema = z.object({
  givenName: z.string().min(1, "Укажите имя."),
  email: z.union([z.email("Укажите корректный email адрес."), z.literal("")]).optional(),
  filterMinDuration: z
    .number()
    .min(0, "Минимальная длительность звонка не может быть отрицательной."),
  filterMinReplicas: z
    .number()
    .min(0, "Минимальное количество реплик не может быть отрицательным."),
  kpiBaseSalary: z.number().min(0, "Базовый оклад не может быть отрицательным."),
  kpiTargetBonus: z.number().min(0, "Целевой бонус не может быть отрицательным."),
  kpiTargetTalkTimeMinutes: z
    .number()
    .min(0, "Целевое время разговоров не может быть отрицательным."),
});
