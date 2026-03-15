import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { slugSchema, updateWorkspaceSchema } from "./schemas";

export const update = protectedProcedure
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
        message: "Недостаточно прав для изменения рабочего пространства",
      });
    }
    if (data.slug) {
      const slugValidation = slugSchema.safeParse(data.slug);
      if (!slugValidation.success) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Допустимые символы идентификатора: латинские буквы, цифры и дефис",
        });
      }

      const existing = await context.workspacesService.getBySlug(data.slug);
      if (existing && existing.id !== workspaceId) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Рабочее пространство с таким идентификатором уже существует",
        });
      }
    }
    await context.workspacesService.update(workspaceId, data);
    return context.workspacesService.getById(workspaceId);
  });
