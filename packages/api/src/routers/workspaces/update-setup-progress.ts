import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { updateSetupProgressSchema } from "./schemas";

export const updateSetupProgress = protectedProcedure
  .input(updateSetupProgressSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId, completedStep } = input;
    const userId = context.authUserId;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Требуется авторизация",
      });
    }

    const member = await context.workspacesService.getMemberWithRole(workspaceId, userId);
    if (!member) {
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к рабочему пространству",
      });
    }

    const updated = await context.workspacesService.addSetupStep(workspaceId, completedStep);

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Рабочее пространство не найдено или не удалось обновить прогресс",
      });
    }

    const currentProgress = await context.workspacesService.getSetupProgress(workspaceId);

    return { success: true, completedSteps: currentProgress };
  });
