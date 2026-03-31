import { isValidUuid, workspaceIdSchema } from "@calls/shared";
import { workspaceNameSchema } from "@calls/validators";
import { z } from "zod";

export { workspaceNameSchema } from "@calls/validators";

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
});

export const workspaceIdInputSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const updateWorkspaceSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: workspaceNameSchema.optional(),
  description: z.string().max(2000, "Не более 2000 символов").nullable().optional(),
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
