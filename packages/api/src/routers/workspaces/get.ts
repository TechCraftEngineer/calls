import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

export const get = protectedProcedure
  .input(workspaceIdInputSchema)
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
        message: "Нет доступа к этому рабочему пространству",
      });
    }
    const ws = await context.workspacesService.getById(input.workspaceId);
    if (!ws) {
      throw new ORPCError("NOT_FOUND", {
        message: "Рабочее пространство не найдено",
      });
    }
    return ws;
  });
