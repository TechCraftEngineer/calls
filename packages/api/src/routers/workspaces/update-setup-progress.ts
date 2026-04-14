import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { updateSetupProgressSchema } from "./schemas";

export const updateSetupProgress = protectedProcedure
  .input(updateSetupProgressSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId, completedSteps } = input;
    const userId = context.authUserId;
    if (!userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Пользователь не авторизован",
      });
    }
    const member = await context.workspacesService.getMemberWithRole(workspaceId, userId);
    if (!member) {
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к рабочему пространству",
      });
    }
    const updated = await context.workspacesService.updateSetupProgress(
      workspaceId,
      completedSteps,
    );
    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Рабочее пространство не найдено или не удалось обновить прогресс",
      });
    }
    return { success: true, completedSteps };
  });
