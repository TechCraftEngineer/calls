import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { createWorkspaceSchema } from "./schemas";

export const create = protectedProcedure
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
        message: "Рабочее пространство с таким идентификатором уже существует",
      });
    }
    const id = await context.workspacesService.create(input, authUserId);
    const ws = await context.workspacesService.getById(id);
    return ws!;
  });
