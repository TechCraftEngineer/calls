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
    const id = await context.workspacesService.create(input, authUserId);
    const ws = await context.workspacesService.getById(id);
    if (!ws)
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось получить созданное рабочее пространство",
      });
    return ws;
  });
