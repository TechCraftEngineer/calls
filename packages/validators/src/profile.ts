import { z } from "zod";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, "Логин должен содержать минимум 2 символа")
    .max(30, "Логин не должен превышать 30 символов")
    .regex(USERNAME_REGEX, "Логин может содержать только буквы, цифры, подчёркивания и дефисы"),
  email: z.email("Введите корректный email"),
  bio: z.string().max(160).optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
