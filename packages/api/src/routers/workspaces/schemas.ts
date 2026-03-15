import { isValidUuid, workspaceIdSchema } from "@calls/shared";
import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1, "Slug обязателен")
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug: только буквы, цифры и дефис");

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(100),
  slug: slugSchema,
});

export const workspaceIdInputSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const updateWorkspaceSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
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
