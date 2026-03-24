import { isValidUuid, workspaceIdSchema } from "@calls/shared";
import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Название обязательно")
    .max(100, "Не более 100 символов"),
});

export const workspaceIdInputSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const updateWorkspaceSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(100).optional(),
  description: z
    .string()
    .max(2000, "Не более 2000 символов")
    .nullable()
    .optional(),
});

export const addMemberSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string().refine((id) => isValidUuid(id), {
    message: "Неверный формат userId. Ожидается UUIDv7",
  }),
  role: z.enum(["owner", "admin", "member"]),
});

export const updateMemberRoleSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string().refine((id) => isValidUuid(id), {
    message: "Неверный формат userId. Ожидается UUIDv7",
  }),
  role: z.enum(["owner", "admin", "member"]),
});

export const removeMemberSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string().min(1, "userId обязателен"),
});
