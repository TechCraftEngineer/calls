import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../orpc";

const slugSchema = z
  .string()
  .min(1, "Slug обязателен")
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug: только буквы, цифры и дефис");

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(100),
  slug: slugSchema,
});

const updateWorkspaceSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
});

const workspaceIdSchema = z.object({
  workspaceId: z.number().int().positive(),
});

const addMemberSchema = z.object({
  workspaceId: z.number().int().positive(),
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member"]),
});

const updateMemberRoleSchema = z.object({
  workspaceId: z.number().int().positive(),
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member"]),
});

const setActiveSchema = z.object({
  workspaceId: z.number().int().positive(),
});

export const workspacesRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const authUserId = context.authUserId;
    if (!authUserId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Требуется авторизация через Better Auth",
      });
    }
    const rows = await context.workspacesService.getUserWorkspaces(authUserId);
    return rows.map((r) => ({
      ...r.workspace,
      role: r.role,
      memberSince: r.createdAt,
    }));
  }),

  get: protectedProcedure
    .input(workspaceIdSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const role = await context.workspacesService.ensureUserInWorkspace(
        input.workspaceId,
        context.authUserId,
      );
      if (!role) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому workspace",
        });
      }
      const ws = await context.workspacesService.getById(input.workspaceId);
      if (!ws) {
        throw new ORPCError("NOT_FOUND", {
          message: "Workspace не найден",
        });
      }
      return ws;
    }),

  create: protectedProcedure
    .input(createWorkspaceSchema)
    .handler(async ({ input, context }) => {
      const authUserId = context.authUserId;
      if (!authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const existing = await context.workspacesService.getBySlug(input.slug);
      if (existing) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Workspace с таким slug уже существует",
        });
      }
      const id = await context.workspacesService.create(input, authUserId);
      const ws = await context.workspacesService.getById(id);
      return ws!;
    }),

  update: protectedProcedure
    .input(updateWorkspaceSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const { workspaceId, ...data } = input;
      const member = await context.workspacesService.getMemberWithRole(
        workspaceId,
        context.authUserId,
      );
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет прав на изменение workspace",
        });
      }
      if (data.slug) {
        // Валидация формата slug
        const slugValidation = slugSchema.safeParse(data.slug);
        if (!slugValidation.success) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Некорректный формат slug: только буквы, цифры и дефис",
          });
        }
        
        const existing = await context.workspacesService.getBySlug(data.slug);
        if (existing && existing.id !== workspaceId) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Workspace с таким slug уже существует",
          });
        }
      }
      await context.workspacesService.update(workspaceId, data);
      return context.workspacesService.getById(workspaceId);
    }),

  delete: protectedProcedure
    .input(workspaceIdSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const member = await context.workspacesService.getMemberWithRole(
        input.workspaceId,
        context.authUserId,
      );
      if (!member || member.role !== "owner") {
        throw new ORPCError("FORBIDDEN", {
          message: "Только владелец может удалить workspace",
        });
      }
      await context.workspacesService.delete(input.workspaceId);
      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(workspaceIdSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const role = await context.workspacesService.ensureUserInWorkspace(
        input.workspaceId,
        context.authUserId,
      );
      if (!role) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет доступа к этому workspace",
        });
      }
      const rows = await context.workspacesService.getMembers(
        input.workspaceId,
      );
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        role: r.role,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
          username: r.user.username,
        },
      }));
    }),

  addMember: protectedProcedure
    .input(addMemberSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const member = await context.workspacesService.getMemberWithRole(
        input.workspaceId,
        context.authUserId,
      );
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет прав на добавление участников",
        });
      }
      const existing = await context.workspacesService.getMemberWithRole(
        input.workspaceId,
        input.userId,
      );
      if (existing) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Пользователь уже в workspace",
        });
      }
      await context.workspacesService.addMember({
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role,
      });
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ workspaceId: z.number(), userId: z.string() }))
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const member = await context.workspacesService.getMemberWithRole(
        input.workspaceId,
        context.authUserId,
      );
      const targetMember = await context.workspacesService.getMemberWithRole(
        input.workspaceId,
        input.userId,
      );
      const canRemove =
        member &&
        (member.role === "owner" ||
          (member.role === "admin" && 
           input.userId !== context.authUserId && 
           targetMember?.role !== "owner"));
      if (!canRemove) {
        throw new ORPCError("FORBIDDEN", {
          message: "Нет прав на удаление участника",
        });
      }
      await context.workspacesService.removeMember(
        input.workspaceId,
        input.userId,
      );
      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const member = await context.workspacesService.getMemberWithRole(
        input.workspaceId,
        context.authUserId,
      );
      if (!member || member.role !== "owner") {
        throw new ORPCError("FORBIDDEN", {
          message: "Только владелец может менять роли",
        });
      }
      await context.workspacesService.updateMemberRole(
        input.workspaceId,
        input.userId,
        input.role,
      );
      return { success: true };
    }),

  setActive: protectedProcedure
    .input(setActiveSchema)
    .handler(async ({ input, context }) => {
      if (!context.authUserId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Требуется авторизация через Better Auth",
        });
      }
      const role = await context.workspacesService.ensureUserInWorkspace(
        input.workspaceId,
        context.authUserId,
      );
      if (!role) {
        throw new ORPCError("FORBIDDEN", {
          message: "Вы не являетесь участником этого workspace",
        });
      }
      return {
        success: true,
        workspaceId: input.workspaceId,
        message:
          "Установите cookie active_workspace_id или заголовок X-Workspace-Id",
      };
    }),
};
